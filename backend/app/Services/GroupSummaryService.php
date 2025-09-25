<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

class GroupSummaryService
{
    public function __construct(private SiiService $siiService) {}

    public function overview(int $groupId): array
    {
        // 1) Documentos del grupo (idéntico a downloadGroupSummaryExcel)
        $docs = DB::table('semantic_doc_index as sdi')
            ->join('documents as d', 'd.id', '=', 'sdi.document_id')
            ->where('sdi.document_group_id', $groupId)
            ->orderBy('sdi.document_id')
            ->get(['d.filename', 'd.status', 'sdi.document_id']);

        if ($docs->isEmpty()) {
            Log::info('No hay documentos para el grupo', ['group_id' => $groupId]);
            abort(404, 'No hay documentos asociados a este grupo.');
        }

        // 2) Documento obligatorios (ordenados por largo desc → matches específicos)
        $obligatorios = DB::table('document_types')
            ->get(['nombre_doc', 'analizar'])
            ->sortByDesc(function($o) { return mb_strlen((string)$o->nombre_doc, 'UTF-8'); })
            ->values();

        // Índice por nombre_doc normalizado para contar apariciones
        $oblIndex = []; // normNombreDoc => ['nombre_doc'=>..., 'analizar'=>int, 'count'=>0]
        foreach ($obligatorios as $obl) {
            $norm = $this->normalizeName((string)$obl->nombre_doc);
            if (!isset($oblIndex[$norm])) {
                $oblIndex[$norm] = [
                    'nombre_doc' => (string)$obl->nombre_doc,
                    'analizar'   => (int)$obl->analizar,
                    'count'      => 0,
                ];
            }
        }

        // 3) Clasificación (igual al controller)
        $matchedAnalyze         = []; // analizar = 1
        $matchedNoAnalyzeStrict = []; // analizar = 0
        $unmatched              = []; // sin match en document_types

        foreach ($docs as $doc) {
            $filename = (string)$doc->filename;
            $normFile = $this->normalizeName($filename);

            $found = false;
            foreach ($obligatorios as $obl) {
                $nombreDoc = (string)$obl->nombre_doc;
                $analizar  = (int)$obl->analizar;

                $normNombre = $this->normalizeName($nombreDoc);
                if ($this->matchFilenameToNombreDoc($normFile, $normNombre)) {
                    $found = true;

                    // contabiliza que este obligatorio apareció al menos 1 vez
                    if (isset($oblIndex[$normNombre])) {
                        $oblIndex[$normNombre]['count']++;
                    }

                    if ($analizar === 1) {
                        $matchedAnalyze[] = $doc;
                    } else {
                        $matchedNoAnalyzeStrict[] = $doc;
                    }
                    break;
                }
            }

            if (!$found) {
                $unmatched[] = $doc;
            }
        }

        // 3.1) Pendientes (obligatorios con count == 0)
        $obligatoriosPendientes = [];
        foreach ($oblIndex as $info) {
            if ((int)$info['count'] === 0) {
                $obligatoriosPendientes[] = [
                    'name'        => (string)$info['nombre_doc'],
                    'state_label' => 'Pendiente',
                ];
            }
        }

        // 4) Construir “analizar” con % cumplimiento (calc igual al Excel)
        $tablaAnalizar = [];
        $totals = ['total'=>0,'conforme'=>0,'inconforme'=>0,'sin_procesar'=>0];

        foreach ($matchedAnalyze as $doc) {
            $documentId = (int)$doc->document_id;

            $si = DB::table('semantic_doc_index')
                ->where('document_id', $documentId)
                ->first(['json_global']);

            // Si no hay json_global o es inválido, % = 0%
            $pctStr = '0%';
            $okCount = 0; $invCount = 0;
            $data = null;

            if ($si) {
                $parsed = json_decode($si->json_global, true);
                if (is_array($parsed)) {
                    $data = $parsed;
                    Log::info($data);
                }
            }

            if (is_array($data)) {
                // Mismo filtro que usa el Excel: ignora llaves sensibles/ID
                $ruts = ['RUT_DEUDOR', 'RUT_CORREDOR', 'EMPRESA_DEUDOR_RUT', 'EMPRESA_CORREDOR_RUT'];
                $invalidComments = [];
                foreach ($data as $key => $value) {
                    if (is_array($value) || is_object($value)) continue;

                    $estado = 'OK';
                    if (in_array((string)$key, $ruts, true)) {
                        $limpio = strtoupper(preg_replace('/[^0-9K]/', '', $value));
                        if (strlen($limpio) < 2) continue;

                        $rut = substr($limpio, 0, -1);
                        $dv  = substr($limpio, -1);

                        $sii = $this->checkRut($rut, $dv); // devuelve Response
                        if ($sii->getStatusCode() === 400) {
                            $estado = 'INVÁLIDO';
                            $invalidComments[] = 'RUT: ' . $value . ' NO EXISTE EN SII';
                        }
                    }

                    if ($estado === 'OK') $okCount++;
                    elseif ($estado === 'INVÁLIDO') $invCount++;

                    $observaciones = count($invalidComments) > 0 ? implode(', ', $invalidComments) : 'Dato Inválido';
                }

                $totalVars = $okCount + $invCount;
                Log::info("Doc $documentId: totalVars=$totalVars, ok=$okCount, inv=$invCount");
                $pctStr = $totalVars > 0 ? round(($okCount / $totalVars) * 100) . '%' : '0%';
                Log::info("Doc $documentId: compliance_pct=$pctStr");
            }

            $status = (int)$doc->status;
            $tablaAnalizar[] = [
                'name'            => (string)$doc->filename,
                'status'          => $status,
                'status_label'    => $status === 1 ? 'Conforme' : ($status === 2 ? 'Inconforme' : '—'),
                'observations'    => $status === 1 ? '-' : ($status === 2 ? $observaciones : '—'),
                'compliance_pct'  => (int) str_replace('%','', $pctStr),
            ];

            $totals['total']++;
            if ($status === 1) $totals['conforme']++;
            elseif ($status === 2) $totals['inconforme']++;
            else $totals['sin_procesar']++;
        }

        // 5) Tablas simples (mapeadas al esquema del front)
        $tablaNoAnalizar = array_map(function($d) {
            return ['name' => (string)$d->filename, 'state_label' => 'OK'];
        }, $matchedNoAnalyzeStrict);

        $tablaUnmatched = array_map(function($d) {
            return ['name' => (string)$d->filename];
        }, $unmatched);

        return [
            'group_id'   => $groupId,
            'group_name' => '', // si tienes el nombre en otra tabla, puedes rellenarlo aquí

            'generated_at'     => Carbon::now('America/Santiago')->toIso8601String(),
            'responsible_user' => 'Administrador',

            'totals' => $totals,

            'pending_mandatory'          => array_values($obligatoriosPendientes),
            'not_to_analyze'             => array_values($tablaNoAnalizar),
            'unmatched_in_obligatorios'  => array_values($tablaUnmatched),
            'analyze'                    => array_values($tablaAnalizar),
        ];
    }

    /** === helpers idénticos a los del controller === */

    private function normalizeName(string $name): string
    {
        $n = Str::upper($name);
        $n = preg_replace('/\.(PDF|PNG|JPE?G)$/', '', $n);
        $n = preg_replace('/_P\d+$/', '', $n);
        $n = preg_replace('/\s+/', ' ', $n);
        $n = trim($n ?? '');
        return $n;
    }

    private function matchFilenameToNombreDoc(string $normFile, string $normNombre): bool
    {
        // Coincidencia por palabras con tolerancia a " DE "
        $parts = preg_split('/\s+/', $normNombre);
        $regex = '';
        $first = true;
        foreach ($parts as $w) {
            $w = preg_quote($w, '/');
            if ($first) {
                $regex .= $w;
                $first = false;
            } else {
                $regex .= '(?:\s+(?:DE\s+)?' . $w . ')';
            }
        }
        return (bool) preg_match('/' . $regex . '/u', $normFile);
    }

    public function checkRut($rut, $dv)
    {
        $max_intentos = 10;
        $intentos = 0;
        $ultimoError = null;

        while ($intentos < $max_intentos) {
            try {
                $datos = $this->siiService->checkDte($rut, $dv);
                return response()->json($datos, 200);
            } catch (\Exception $e) {
                $intentos++;
                $ultimoError = $e; // Guarda el último error
                Log::error("Intento $intentos fallido: " . $e->getMessage());
            }
        }

        // Fuera del while: si llegamos aquí, todos los intentos fallaron
        return response()->json([
            'code' => 400,
            'intentos' => $intentos,
            'message' => $ultimoError ? $ultimoError->getMessage() : 'Error desconocido.'
        ], 400);
    }
}

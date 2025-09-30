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
        // 0) Obtener información del grupo
        $groupInfo = DB::table('document_groups')
            ->where('id', $groupId)
            ->first(['name']);
        
        $groupName = $groupInfo ? $groupInfo->name : 'Grupo Desconocido';

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

        // 2) Documentos obligatorios ESPECÍFICOS para este grupo (desde group_field_specs)
        $obligatorios = DB::table('group_field_specs as gfs')
            ->join('document_types as dt', 'gfs.document_type_id', '=', 'dt.id')
            ->where('gfs.group_id', $groupId)
            ->get(['dt.nombre_doc', 'dt.analizar'])
            ->sortByDesc(function($o) { return mb_strlen((string)$o->nombre_doc, 'UTF-8'); })
            ->values();

        // Si no hay configuración específica para el grupo, retornar resumen vacío
        if ($obligatorios->isEmpty()) {
            return [
                'group_id'   => $groupId,
                'group_name' => $groupName,

                'generated_at'     => Carbon::now('America/Santiago')->toIso8601String(),
                'responsible_user' => 'Administrador',

                'totals' => ['total'=>0,'conforme'=>0,'inconforme'=>0,'sin_procesar'=>0],

                'pending_mandatory'          => [],
                'not_to_analyze'             => [],
                'unmatched_in_obligatorios'  => array_map(function($d) {
                    return ['name' => (string)$d->filename];
                }, $docs->toArray()),
                'analyze'                    => [],
            ];
        }

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

                // 4) Construir "analizar" con % cumplimiento basado en campos obligatorios del grupo
        $tablaAnalizar = [];
        $totals = ['total'=>0,'conforme'=>0,'inconforme'=>0,'sin_procesar'=>0];

        foreach ($matchedAnalyze as $doc) {
            $documentId = (int)$doc->document_id;
            $detectedFields = [];
            $compliancePct = 0;

            $si = DB::table('semantic_doc_index')
                ->where('document_id', $documentId)
                ->first(['json_global']);

            if ($si && $si->json_global) {
                $parsed = json_decode($si->json_global, true);
                if (is_array($parsed)) {
                    $detectedFields = array_keys($parsed);
                }
            }

            // Calcular % cumplimiento basándose en campos obligatorios del grupo
            $documentType = null;
            foreach ($obligatorios as $obl) {
                $normFile = $this->normalizeName((string)$doc->filename);
                $normDoc = $this->normalizeName((string)$obl->nombre_doc);
                if ($this->matchFilenameToNombreDoc($normFile, $normDoc) && $obl->analizar === 1) {
                    $documentType = $obl;
                    break;
                }
            }

            if ($documentType) {
                // Obtener campos obligatorios para este tipo de documento
                $requiredFields = DB::table('group_field_specs as gfs')
                    ->join('document_field_specs as dfs', 'gfs.field_spec_id', '=', 'dfs.id')
                    ->join('document_types as dt', 'gfs.document_type_id', '=', 'dt.id')
                    ->where('gfs.group_id', $groupId)
                    ->where('dt.nombre_doc', $documentType->nombre_doc)
                    ->where('dt.analizar', 1)
                    ->whereNotNull('gfs.field_spec_id')
                    ->where('dfs.is_required', true)
                    ->pluck('dfs.field_key')
                    ->toArray();

                if (count($requiredFields) > 0) {
                    $foundFields = array_intersect($requiredFields, $detectedFields);
                    $compliancePct = round((count($foundFields) / count($requiredFields)) * 100);
                } else {
                    $compliancePct = 100; // Si no hay campos obligatorios, 100%
                }
            }

            $status = (int)$doc->status;
            $tablaAnalizar[] = [
                'name'            => (string)$doc->filename,
                'status'          => $status,
                'status_label'    => $status === 1 ? 'Conforme' : ($status === 2 ? 'Inconforme' : '—'),
                'observations'    => $status === 1 ? '-' : ($status === 2 ? 'Requiere revisión' : '—'),
                'compliance_pct'  => $compliancePct,
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
            'group_name' => $groupName,

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

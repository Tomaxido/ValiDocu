<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Exports\DocumentSummaryExport;
use App\Exports\GroupDocumentSummaryExport;
use App\Exports\OverviewGroupSummaryExport;
use Maatwebsite\Excel\Facades\Excel;
use App\Services\GroupSummaryService;
use App\Services\SiiService;

class DocumentSummaryController extends Controller
{

    protected GroupSummaryService $service;

    public function __construct(SiiService $siiService, GroupSummaryService $service)
    {
        parent::__construct($siiService);
        $this->service = $service;
    }
    /** GET /api/v1/groups/{groupId}/overview */
    public function overviewJson(int $groupId)
    {
        return response()->json($this->service->overview($groupId));
    }

    /**
     * NUEVA LÓGICA: Genera un solo Excel con:
     *  - Hoja 1: Overview (Fecha/Usuario + 3 tablas)
     *  - Hojas siguientes: SOLO documentos cuyo filename coincide con un nombre_doc con analizar=1
     *      (title de la hoja = d.filename)
     */
    public function downloadGroupSummaryExcel($groupId)
    {
        try {
            // 1) Documentos del grupo
            $docs = DB::table('semantic_doc_index as sdi')
                ->join('documents as d', 'd.id', '=', 'sdi.document_id')
                ->where('sdi.document_group_id', $groupId)
                ->orderBy('sdi.document_id')
                ->get(['d.filename', 'd.status', 'sdi.document_id']);

            $group_name = DB::table('document_groups')->where('id', $groupId)->value('name')->first();

            if ($docs->isEmpty()) {
                Log::info('No hay documentos para el grupo', ['group_id' => $groupId]);
                abort(404, 'No hay documentos asociados a este grupo.');
            }

            // 2) Documentos obligatorios (ordenados por largo desc para matches más específicos)
            $obligatorios = DB::table('documentos_obligatorios')
                ->get(['nombre_doc', 'analizar'])
                ->sortByDesc(function($o) { return mb_strlen((string)$o->nombre_doc, 'UTF-8'); })
                ->values();

            // Índice por nombre_doc normalizado para contar coincidencias (1..n permitidas, pero necesitamos >=1)
            $oblIndex = []; // key = normNombreDoc => ['nombre_doc'=>orig, 'analizar'=>int, 'count'=>0]
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

            // 3) Clasificación
            $matchedAnalyze         = []; // analizar = 1 (generan hoja)
            $matchedNoAnalyzeStrict = []; // analizar = 0 (no generan hoja; Tabla 1 Overview)
            $unmatched              = []; // sin match en documentos_obligatorios (no generan hoja; Tabla 2 Overview)

            foreach ($docs as $doc) {
                $filename = (string)$doc->filename;
                $normFile = $this->normalizeName($filename);
                Log::info("Analizando documento: {$filename}, normalizado: {$normFile}");

                $found = false;
                foreach ($obligatorios as $obl) {
                    $nombreDoc = (string)$obl->nombre_doc;
                    $analizar  = (int)$obl->analizar;
                    Log::info("Nombre Documento Obligatorio: {$nombreDoc}, analizar: {$analizar}");

                    $normNombre = $this->normalizeName($nombreDoc);
                    if ($this->matchFilenameToNombreDoc($normFile, $normNombre)) {
                        $found = true;

                        // Contabiliza que este tipo de obligatorio sí apareció al menos una vez
                        if (isset($oblIndex[$normNombre])) {
                            $oblIndex[$normNombre]['count']++;
                        }

                        if ($analizar === 1) {
                            $matchedAnalyze[] = $doc;             // => sí generan hoja
                        } else {
                            $matchedNoAnalyzeStrict[] = $doc;     // => no generan hoja (Tabla 1)
                        }
                        break; // un doc queda asociado al primer nombre_doc que calce
                    }
                }

                if (!$found) {
                    $unmatched[] = $doc; // => no generan hoja (Tabla 2)
                }
            }

            // 3.1) Obligatorios no encontrados (>=1 requerido, si count == 0 => Pendiente)
            $obligatoriosPendientes = [];
            foreach ($oblIndex as $norm => $info) {
                if ((int)$info['count'] === 0) {
                    $obligatoriosPendientes[] = [
                        'nombre_documento' => (string)$info['nombre_doc'],
                        'estado'           => 'Pendiente',
                    ];
                }
            }

            Log::info("downloadGroupSummaryExcel | group {$groupId}", [
                'docs_total'                 => $docs->count(),
                'matched_analyze'            => count($matchedAnalyze),
                'matched_no_analyze_strict'  => count($matchedNoAnalyzeStrict),
                'unmatched'                  => count($unmatched),
                'obligatorios_pendientes'    => count($obligatoriosPendientes),
            ]);

            // 4) Construir hojas de "analizar" y a la vez calcular % cumplimiento por documento
            $sheets = [];
            $tablaAnalizar = []; // para la Overview, con % calculado

            foreach ($matchedAnalyze as $doc) {
                $documentId = (int)$doc->document_id;
                $si = DB::table('semantic_doc_index')
                    ->where('document_id', $documentId)
                    ->first(['json_global']);

                if (!$si) {
                    // Placeholder si falta
                    $rows = [
                        ['MENSAJE', "Documento {$documentId} no disponible", 'INVÁLIDO', '']
                    ];
                    $headerRows = [];
                    $sheets[] = new DocumentSummaryExport(
                        rows: $rows,
                        headings: ['VARIABLE','INFORMACIÓN', 'ESTADO', 'COMENTARIO'],
                        headerRows: $headerRows,
                        title: (string)$doc->filename
                    );

                    // % cumplimiento = 0% (no hay datos reales)
                    $tablaAnalizar[] = [
                        'nombre_documento' => (string)$doc->filename,
                        'estado'           => (int)$doc->status,
                        'observaciones'    => ((int)$doc->status === 1 ? 'Conforme' : ((int)$doc->status === 2 ? 'Inconforme' : '—')),
                        'porcentaje'       => '0%',
                    ];
                    continue;
                }

                $data = json_decode($si->json_global, true);
                if (!is_array($data)) {
                    // Placeholder si JSON inválido
                    $rows = [
                        ['MENSAJE', "Documento {$documentId} con JSON inválido", 'INVÁLIDO', '']
                    ];
                    $headerRows = [];
                    $sheets[] = new DocumentSummaryExport(
                        rows: $rows,
                        headings: ['VARIABLE','INFORMACIÓN', 'ESTADO', 'COMENTARIO'],
                        headerRows: $headerRows,
                        title: (string)$doc->filename
                    );

                    $tablaAnalizar[] = [
                        'nombre_documento' => (string)$doc->filename,
                        'estado'           => (int)$doc->status,
                        'observaciones'    => ((int)$doc->status === 1 ? 'Conforme' : ((int)$doc->status === 2 ? 'Inconforme' : '—')),
                        'porcentaje'       => '0%',
                    ];
                    continue;
                }

                // Header del bloque
                $headerRows = [
                    ['Deudor',  $data['NOMBRE_COMPLETO_DEUDOR'] ?? ''],
                    ['RUT',     $data['RUT_DEUDOR'] ?? ($data['EMPRESA_DEUDOR_RUT'] ?? '')],
                    ['Empresa', $data['EMPRESA_DEUDOR'] ?? ''],
                ];

                // Filas + cálculo de cumplimiento
                $rows = [];
                $ruts = ['RUT_DEUDOR', 'RUT_CORREDOR', 'EMPRESA_DEUDOR_RUT', 'EMPRESA_CORREDOR_RUT'];

                $okCount = 0;
                $invCount = 0;
                $invalidComments = [];

                foreach ($data as $key => $value) {
                    if (is_array($value) || is_object($value)) {
                        $value = json_encode($value, JSON_UNESCAPED_UNICODE);
                    }

                    $state = 'OK';
                    if (in_array((string)$key, $ruts, true)) {
                        $limpio = strtoupper(preg_replace('/[^0-9K]/', '', $value));
                        if (strlen($limpio) < 2) continue;

                        $rut = substr($limpio, 0, -1);
                        $dv  = substr($limpio, -1);

                        $sii = $this->checkRut($rut, $dv); // devuelve Response
                        if ($sii->getStatusCode() === 400) {
                            $state = 'INVÁLIDO';
                            $invalidComments[] = 'RUT: ' . $value . ' NO EXISTE EN SII';
                        }
                    }

                    $observaciones = count($invalidComments) > 0 ? implode("\n", $invalidComments) : 'Dato Inválido';
                    $comment = $state === 'INVÁLIDO' ? 'NO EXISTE EN SII' : 'OK';

                    if ($state === 'OK')       $okCount++;
                    if ($state === 'INVÁLIDO') $invCount++;

                    $rows[]  = [str_replace('_', ' ', (string)$key), (string)$value, $state, $comment];
                }

                $totalVars = $okCount + $invCount;
                $pct = $totalVars > 0 ? round(($okCount / $totalVars) * 100) . '%' : '0%';

                // Crear sheet del documento
                $sheets[] = new DocumentSummaryExport(
                    rows: $rows,
                    headings: ['VARIABLE','INFORMACIÓN', 'ESTADO', 'COMENTARIO'],
                    headerRows: $headerRows,
                    title: (string)$doc->filename // título = d.filename
                );

                // Entrada para la Overview con % calculado
                $status = (int)$doc->status;
                $tablaAnalizar[] = [
                    'nombre_documento' => (string)$doc->filename,
                    'estado'           => $status === 1 ? 'Conforme' : ($status === 2 ? 'Inconforme' : '—'),
                    'observaciones'    => $status === 1 ? '-' : ($status === 2 ? $observaciones : '—'),
                    'porcentaje'       => $pct,
                ];
            }

            // 5) Construir Overview con las 4 tablas (incluye PENDIENTES)
            $tablaNoAnalizar = array_map(function($d) {
                return [
                    'nombre_documento' => (string)$d->filename,
                    'estado'           => 'OK',
                ];
            }, $matchedNoAnalyzeStrict);

            $tablaUnmatched = array_map(function($d) {
                return [
                    'nombre_documento' => (string)$d->filename,
                ];
            }, $unmatched);

            // NUEVO: pasar también "pendientes"
            $overview = new OverviewGroupSummaryExport(
                fechaGeneracion: \Carbon\Carbon::now('America/Santiago'),
                usuarioResponsable: 'Administrador',
                tablaNoAnalizar: $tablaNoAnalizar,
                tablaUnmatched:  $tablaUnmatched,
                tablaAnalizar:   $tablaAnalizar,        // con % calculado
                tablaPendientes: $obligatoriosPendientes
            );

            // Insertar Overview como PRIMERA hoja
            array_unshift($sheets, $overview);

            // 6) Descargar
            $export   = new GroupDocumentSummaryExport($sheets);
            $ts       = Carbon::now('America/Santiago')->format('Y-m-d_Hi');
            $filename = "resumen_grupo_{$groupId}_{$ts}.xlsx";

            return Excel::download($export, $filename);

        } catch (\Throwable $e) {
            Log::error('downloadGroupSummaryExcel failed', [
                'group_id' => $groupId,
                'message'  => $e->getMessage(),
                'trace'    => $e->getTraceAsString(),
            ]);
            abort(500, 'Error generando el Excel del grupo. Revisa logs.');
        }
    }


    /**
     * Normaliza un nombre para facilitar el match: quita acentos, upper, colapsa espacios.
     */
    private function normalizeName(string $name): string
    {
        $ascii = Str::ascii($name);
        $upper = mb_strtoupper($ascii, 'UTF-8');
        // reemplazar múltiples espacios y signos por un solo espacio
        $upper = preg_replace('/[^A-Z0-9]+/u', ' ', $upper);
        $upper = trim(preg_replace('/\s+/', ' ', $upper) ?? '');
        return $upper;
    }

    /**
     * Match flexible entre filename y nombre_doc:
     * - Compara cadenas normalizadas (mayúsculas sin acentos)
     * - Permite "DE" opcional entre palabras del nombre_doc.
     * - Requiere que todas las palabras de nombre_doc aparezcan en orden en filename.
     */
    private function matchFilenameToNombreDoc(string $normFile, string $normNombre): bool
    {
        if ($normNombre === '') return false;
        $parts = array_filter(preg_split('/\s+/', $normNombre) ?: [], function($w) {
            return $w !== 'DE';
        });
        // construir regex: WORD1 (?:\s+(?:DE\s+)?WORD2) (?:\s+(?:DE\s+)?WORD3) ...
        if (empty($parts)) return false;

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
        // buscar en cualquier parte, case-insensitive (ya está upper), U para unicode
        return (bool) preg_match('/' . $regex . '/u', $normFile);
    }

    /** GET /api/v1/mandatory-docs
     *  Retorna sólo nombre_doc desde documentos_obligatorios, ordenado alfabéticamente.
     */
    public function mandatoryDocs()
    {
        $items = DB::table('documentos_obligatorios')
            ->orderBy('nombre_doc')
            ->pluck('nombre_doc')
            ->toArray();

        return response()->json(['items' => $items]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Support\FlexibleDateParser;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use PhpParser\Node\Stmt\TryCatch;


class SemanticController extends Controller
{
    public function buscarSimilares(Request $request)
    {
        $query = $request->input('texto');
        $embedding = $this->generarEmbedding($query);

        if (!is_array($embedding)) {
            return response()->json(['message' => 'Error al generar embedding'], 500);
        }

        // Format the array as a PostgreSQL vector literal with square brackets
        $embeddingStr = '[' . implode(',', $embedding) . ']';

        // Use parameter binding for safer queries
        $resultados = DB::select("
            SELECT * FROM (
                SELECT
                    sdi.id, sdi.resumen, sdi.archivo, sdi.document_group_id,
                    dv.document_id, dv.filename AS document_name, 
                    g.name AS group_name,
                    dv.due_date AS due_date,
                    dv.normative_gap AS normative_gap,
                    1 - (sdi.embedding <=> ?::vector) as score
                FROM semantic_doc_index sdi
                LEFT JOIN document_versions dv ON dv.id = sdi.document_version_id AND dv.is_current = true
                LEFT JOIN document_groups g ON g.id = sdi.document_group_id
            ) AS sub
            WHERE score >= 0.4
            ORDER BY score DESC
            LIMIT 10;
        ", [$embeddingStr]);

        return response()->json($resultados);
    }
    private function generarEmbedding($texto)
    {
        try {
            $response = Http::post('http://localhost:5050/vector/', [
                'texto' => $texto,
            ]);

            if (!$response->successful()) {
                Log::error("❌ Error en respuesta de API embedding", ['status' => $response->status(), 'body' => $response->body()]);
                return null;
            }

            $json = $response->json();

            if (!is_array($json) || !isset($json['embedding'])) {
                Log::error("❌ Embedding malformado o vacío", ['response' => $json]);
                return null;
            }

            return $json['embedding'];

        } catch (\Exception $e) {
            Log::error("❌ Excepción al llamar a la API de embedding", ['error' => $e->getMessage()]);
            return null;
        }
    }

    public function buscarJsonLayoutByDocumentId(int $id_documento): JsonResponse
    {
        try {
            $resultado = DB::table('semantic_index')
                ->where('document_version_id', $id_documento)
                ->value('json_layout');

            if (is_null($resultado)) {
                return response()->json(['message' => 'Documento no encontrado o sin layout'], 404);
            }

            return response()->json(json_decode($resultado));

        } catch (\Exception $e) {
            Log::error("❌ Excepción al obtener json_layout", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al obtener json_layout'], 500);
        }
    }

    private function filtrarDocumentosVencidos(Collection &$documentos): array
    {
        $documentosVencidos = array();
        $documentosPorVencer = array();
        foreach ($documentos as $doc) {
            if (empty($doc->json_global)) continue;
            $jsonGlobal = json_decode($doc->json_global);
            if (!$jsonGlobal || !property_exists($jsonGlobal, 'FECHA_VENCIMIENTO')) {
                continue;
            }
            $fechaVencimientoStr = $jsonGlobal->FECHA_VENCIMIENTO;
            $fechaVencimientoStr = str_replace(' del ', ' de ', $fechaVencimientoStr);
            try {
                $fechaVencimiento = FlexibleDateParser::parse($fechaVencimientoStr);
            } catch (\Throwable $e) {
                continue;
            }
            $diasDesdeVencimiento = $fechaVencimiento->diffInDays(Carbon::now());
            if ($diasDesdeVencimiento > 1) {
                array_push($documentosVencidos, $doc);
            } else if ($diasDesdeVencimiento > -30) {
                array_push($documentosPorVencer, $doc);
            }
        }

        return array($documentosVencidos, $documentosPorVencer);
    }

    public function obtenerDocumentosVencidos(): JsonResponse
    {
        try {
            // Obtener documentos con sus versiones actuales y datos de semantic_doc_index
            $documentos = DB::table('semantic_doc_index as sdi')
                ->join('document_versions as dv', 'sdi.document_version_id', '=', 'dv.id')
                ->join('documents as d', 'dv.document_id', '=', 'd.id')
                ->where('dv.is_current', true)
                ->select('sdi.*', 'dv.due_date', 'd.id as document_id')
                ->get();

            list($documentosVencidos, $documentosPorVencer) = $this->filtrarDocumentosVencidos($documentos);

            return response()->json(array(
                "documentosVencidos" => $documentosVencidos,
                "documentosPorVencer" => $documentosPorVencer,
            ));
        } catch (\Exception $e) {
            Log::error("❌ Excepción al obtener documentos", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al obtener documentos'], 500);
        }
    }

    public function obtenerDocumentosVencidosDeGrupo(int $id_grupo): JsonResponse
    {
        try {
            // Obtener documentos del grupo con sus versiones actuales
            $documentos = DB::table('semantic_doc_index as sdi')
                ->join('document_versions as dv', 'sdi.document_version_id', '=', 'dv.id')
                ->join('documents as d', 'dv.document_id', '=', 'd.id')
                ->where('dv.is_current', true)
                ->where('sdi.document_group_id', $id_grupo)
                ->select('sdi.*', 'dv.due_date', 'd.id as document_id')
                ->get();

            list($documentosVencidos, $documentosPorVencer) = $this->filtrarDocumentosVencidos($documentos);

            return response()->json(array(
                "documentosVencidos" => $documentosVencidos,
                "documentosPorVencer" => $documentosPorVencer,
            ));
        } catch (\Exception $e) {
            Log::error("❌ Excepción al obtener documentos", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al obtener documentos'], 500);
        }
    }

    public function marcarDocumentosVencidos(): JsonResponse
    {
        try {
            // Obtener documentos con sus versiones actuales
            $documentos = DB::table('semantic_doc_index as sdi')
                ->join('document_versions as dv', 'sdi.document_version_id', '=', 'dv.id')
                ->join('documents as d', 'dv.document_id', '=', 'd.id')
                ->where('dv.is_current', true)
                ->select('sdi.*', 'dv.id as version_id', 'd.id as document_id')
                ->get();
                
            list($documentosVencidos, $documentosPorVencer) = $this->filtrarDocumentosVencidos($documentos);
            
            $idsVersionesVencidas = array();
            $idsVersionesPorVencer = array();
            
            foreach ($documentosVencidos as $doc) {
                array_push($idsVersionesVencidas, $doc->version_id);
            }

            // Actualizar due_date en document_versions (no en documents)
            DB::table('document_versions')->whereIn('id', $idsVersionesVencidas)->update(['due_date' => 1]);

            foreach ($documentosPorVencer as $doc) {
                array_push($idsVersionesPorVencer, $doc->version_id);
            }

            DB::table('document_versions')->whereIn('id', $idsVersionesPorVencer)->update(['due_date' => 2]);
            
            return response()->json([
                'documentosVencidos' => array_map(fn($doc) => $doc->document_id, $documentosVencidos),
                'versionesActualizadas' => count($idsVersionesVencidas) + count($idsVersionesPorVencer)
            ], 200);
        } catch (\Exception $e) {
            Log::error("❌ Excepción al marcar documentos vencidos", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al marcar documentos vencidos'], 500);
        }
    }

    public function obtenerFiltrosUnicos(): JsonResponse
    {
        // Obtener valores únicos de las versiones actuales
        $statuses = DB::table('document_versions')
            ->where('is_current', true)
            ->whereNotNull('due_date')
            ->distinct()
            ->orderBy('due_date')
            ->pluck('due_date')
            ->all();

        $docTypes = DB::table('documents')
            ->whereNotNull('document_type_id')
            ->distinct()
            ->orderBy('document_type_id')
            ->pluck('document_type_id')
            ->all();

        $gaps = DB::table('document_versions')
            ->where('is_current', true)
            ->whereNotNull('normative_gap')
            ->distinct()
            ->orderBy('normative_gap')
            ->pluck('normative_gap')
            ->all();

        // Mapea aquí tus etiquetas oficiales
        $STATUS_LABELS = [
            0 => 'Vigente',
            1 => 'Vencido',
            2 => 'Por vencer',
        ];
        $DOC_TYPE_LABELS = [0 => 'Otros'];
        foreach (DB::table('document_types')->select('id', 'nombre_doc')->get() as $row) {
            $DOC_TYPE_LABELS[$row->id] = $row->nombre_doc;
        }

        $GAP_LABELS = [
            0 => 'No tiene',
            1 => 'Si tiene',
        ];

        return response()->json([
            'status_values' => array_values(array_map(
                fn($v) => ['value' => is_numeric($v) ? (int)$v : $v, 'label' => $STATUS_LABELS[$v] ?? (string)$v],
                $statuses
            )),
            'doc_type_values' => array_values(array_map(
                fn($v) => ['value' => (int)$v, 'label' => $DOC_TYPE_LABELS[(int)$v] ?? (string)$v],
                $docTypes
            )),
            'normative_gap_values' => array_values(array_map(
                fn($v) => ['value' => (int)$v, 'label' => $GAP_LABELS[(int)$v] ?? (string)$v],
                $gaps
            )),
        ]);
    }

    public function buscarSimilaresConFiltros(Request $request)
    {
        // ---- (1) Leer filtros: aceptar array o valor único
        $status = $request->input('status');             // p.ej. [0,1,2] o "1"
        $docType = $request->input('doc_type');
        $normGap = $request->input('normative_gap');     // p.ej. [0,2,3] o 2

        // Normalizar a arrays si vienen valores simples
        if (!is_null($status) && !is_array($status)) {
            $status = [$status];
        }
        if (!is_null($docType) && !is_array($docType)) {
            $docType = [$docType];
        }
        if (!is_null($normGap) && !is_array($normGap)) {
            $normGap = [$normGap];
        }

        // ---- (2) Construir WHERE dinámico y sus bindings
        $whereParts = [];
        $whereBinds = [];

        if (!empty($status)) {
            $placeholders = implode(',', array_fill(0, count($status), '?'));
            $whereParts[] = "dv.due_date IN ($placeholders)";
            // Opcional: castear a int si tu status es entero
            foreach ($status as $s) {
                $whereBinds[] = is_numeric($s) ? (int)$s : $s;
            }
        }

        if (!empty($docType)) {
            $placeholders = implode(',', array_fill(0, count($docType), '?'));
            $whereParts[] = "d.document_type_id IN ($placeholders)";
            // Opcional: castear a int si tu docType es entero
            foreach ($docType as $s) {
                $whereBinds[] = is_numeric($s) ? (int)$s : $s;
            }
        }

        if (!empty($normGap)) {
            $placeholders = implode(',', array_fill(0, count($normGap), '?'));
            $whereParts[] = "dv.normative_gap IN ($placeholders)";
            foreach ($normGap as $g) {
                $whereBinds[] = (int)$g;
            }
        }

        $whereFiltersSql = count($whereParts) ? 'WHERE ' . implode(' AND ', $whereParts) : '';

        // ---- (3) (Opcional) umbral y límite configurables
        $minScore = (float)($request->input('min_score', 0.4));
        $limit    = (int)($request->input('limit', 10));
        // ---- (4) Generar dinámicamente la query SQL
        $query = $request->input('texto');
        if (trim($query) === '') {
            // 4.a. Si no hay una query en la petición, solo aplicar filtros en la tabla
            // IMPORTANTE: el orden de los placeholders define el orden de $bindings.
            // Aquí ponemos primero los filtros, luego el min_score y el limit.
            Log::info("Filtros recibidos", ['status' => $status, 'docType' => $docType, 'normGap' => $normGap, 'whereSql' => $whereFiltersSql, 'whereBinds' => $whereBinds]);

            $sqlQuery = "
                SELECT
                    sdi.id,
                    sdi.resumen,
                    sdi.archivo,
                    sdi.document_group_id,
                    dv.document_id,
                    dv.filename AS document_name,
                    dv.due_date AS due_date,
                    d.document_type_id AS tipo,
                    dv.normative_gap AS normative_gap,
                    g.name AS group_name
                FROM semantic_doc_index sdi
                LEFT JOIN document_versions dv ON dv.id = sdi.document_version_id AND dv.is_current = true
                LEFT JOIN documents d ON d.id = dv.document_id
                LEFT JOIN document_groups g ON g.id = sdi.document_group_id
                $whereFiltersSql
                LIMIT ?;
            ";
            $bindings = array_merge($whereBinds, [$limit]);
        } else {
            Log::info("Filtros2 recibidos", ['status' => $status, 'docType' => $docType, 'normGap' => $normGap, 'whereSql' => $whereFiltersSql, 'whereBinds' => $whereBinds]);

            // 4.b. Si hay una query en la petición, generar un embedding
            $embedding = $this->generarEmbedding($query);
            if (!is_array($embedding)) {
                return response()->json(['message' => 'Error al generar embedding'], 500);
            }

            // Preparar embedding como vector literal
            $embeddingStr = '[' . implode(',', $embedding) . ']';


            // IMPORTANTE: el orden de los placeholders define el orden de $bindings.
            // Aquí ponemos primero el embedding (aparece antes en el SQL), luego los filtros,
            // luego el min_score y el limit.
            $sqlQuery = "
                SELECT * FROM (
                    SELECT
                        sdi.id,
                        sdi.resumen,
                        sdi.archivo,
                        sdi.document_group_id,
                        dv.document_id,
                        dv.filename AS document_name,
                        dv.due_date AS due_date,
                        dv.normative_gap AS normative_gap,
                        d.document_type_id AS tipo,
                        g.name AS group_name,
                        1 - (sdi.embedding <=> ?::vector) AS score
                    FROM semantic_doc_index sdi
                    LEFT JOIN document_versions dv ON dv.id = sdi.document_version_id AND dv.is_current = true
                    LEFT JOIN documents d ON d.id = dv.document_id
                    LEFT JOIN document_groups g ON g.id = sdi.document_group_id
                    $whereFiltersSql
                ) AS sub
                WHERE score >= ?
                ORDER BY score DESC
                LIMIT ?;
            ";
            $bindings = array_merge([$embeddingStr], $whereBinds, [$minScore, $limit]);
        }

        Log::info(message: 'Consulta'. $sqlQuery. ' | bindings: ' . json_encode($bindings));

        $resultados = DB::select($sqlQuery, $bindings);

        Log::info("Resultados obtenidos", ['count' => count($resultados), 'data' => $resultados]);

        return response()->json($resultados);
    }

    /**
     * Buscar el layout JSON con coordenadas desde semantic_doc_index 
     * (Función que busca en semantic_doc_index.json_layout directamente)
     */
    public function buscaDocJsonLayoutByDocumentId(int $documentId): JsonResponse
    {
        try {
            // Buscar el layout de la versión actual del documento
            $result = DB::table('semantic_doc_index as sdi')
                ->join('document_versions as dv', 'sdi.document_version_id', '=', 'dv.id')
                ->where('dv.document_id', $documentId)
                ->where('dv.is_current', true)
                ->first(['sdi.json_layout']);

            if (!$result || !$result->json_layout) {
                return response()->json([
                    'message' => 'No se encontró layout para el documento especificado',
                    'document_id' => $documentId
                ], 404);
            }

            $layout = json_decode($result->json_layout, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'message' => 'Error al decodificar el layout JSON',
                    'error' => json_last_error_msg()
                ], 500);
            }

            // El json_layout ya tiene el formato con coordenadas
            // [{"page": 1, "text": "CONTRATO DE MUTUO", "boxes": [[131, 154, 1014, 192]], "label": "TIPO_DOCUMENTO"}]
            
            return response()->json($layout);
        } catch (\Exception $e) {
            Log::error('Error al buscar layout del documento', [
                'document_id' => $documentId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Error interno al buscar el layout del documento'
            ], 500);
        }
    }


}

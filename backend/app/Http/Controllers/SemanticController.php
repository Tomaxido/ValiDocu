<?php

namespace App\Http\Controllers;

use App\Support\FlexibleDateParser;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;
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
                    si.id, si.resumen, si.archivo, si.document_id, si.document_group_id,
                    d.filename AS document_name, g.name AS group_name,
                    1 - (si.embedding <=> ?::vector) as score
                FROM semantic_index si
                LEFT JOIN documents d ON d.id = si.document_id
                LEFT JOIN document_groups g ON g.id = si.document_group_id
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
                \Log::error("❌ Error en respuesta de API embedding", ['status' => $response->status(), 'body' => $response->body()]);
                return null;
            }

            $json = $response->json();

            if (!is_array($json) || !isset($json['embedding'])) {
                \Log::error("❌ Embedding malformado o vacío", ['response' => $json]);
                return null;
            }

            return $json['embedding'];

        } catch (\Exception $e) {
            \Log::error("❌ Excepción al llamar a la API de embedding", ['error' => $e->getMessage()]);
            return null;
        }
    }

    public function buscarJsonLayoutByDocumentId(int $id_documento): JsonResponse
    {
        try {
            $resultado = DB::table('semantic_index')
                ->where('document_id', $id_documento)
                ->value('json_layout');

            if (is_null($resultado)) {
                return response()->json(['message' => 'Documento no encontrado o sin layout'], 404);
            }

            return response()->json(json_decode($resultado));

        } catch (\Exception $e) {
            \Log::error("❌ Excepción al obtener json_layout", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al obtener json_layout'], 500);
        }
    }

    function _filtrarDocumentosVencidos(Collection &$documentos): array
    {
        $documentosVencidos = array();
        $documentosPorVencer = array();
        foreach ($documentos as $doc) {
            $jsonGlobal = json_decode($doc->json_global);
            if (!property_exists($jsonGlobal, 'FECHA_VENCIMIENTO')) {
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
            $documentos = DB::table('semantic_doc_index')->get();

            list($documentosVencidos, $documentosPorVencer) = $this->_filtrarDocumentosVencidos($documentos);

            return response()->json(array(
                "documentosVencidos" => $documentosVencidos,
                "documentosPorVencer" => $documentosPorVencer,
            ));
        } catch (\Exception $e) {
            \Log::error("❌ Excepción al obtener documentos", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al obtener documentos'], 500);
        }
    }

    public function obtenerDocumentosVencidosDeGrupo(int $id_grupo): JsonResponse
    {
        try {
            $documentos = DB::table('semantic_doc_index')
                ->where('document_group_id', $id_grupo)
                ->get();

            list($documentosVencidos, $documentosPorVencer) = $this->_filtrarDocumentosVencidos($documentos);

            return response()->json(array(
                "documentosVencidos" => $documentosVencidos,
                "documentosPorVencer" => $documentosPorVencer,
            ));
        } catch (\Exception $e) {
            \Log::error("❌ Excepción al obtener documentos", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al obtener documentos'], 500);
        }
    }

    public function marcarDocumentosVencidos(): JsonResponse
    {
        try {
            $documentos = DB::table('semantic_doc_index')->get();
            list($documentosVencidos, $documentosPorVencer) = $this->_filtrarDocumentosVencidos($documentos);
            $idsVencidas = array();
            $idsPorVencer = array();
            foreach ($documentosVencidos as $doc) {
                array_push($idsVencidas, $doc->document_id);
            }

            DB::table('documents')->whereIn('id', $idsVencidas)->update(['due_date' => 1]);

            foreach ($documentosPorVencer as $doc) {
                array_push($idsPorVencer, $doc->document_id);
            }

            DB::table('documents')->whereIn('id', $idsPorVencer)->update(['due_date' => 2]);
            return response()->json(['documentosVencidos' => $idsVencidas], 200);
        } catch (\Exception $e) {
            \Log::error("❌ Excepción al obtener documentos", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al obtener documentos'], 500);
        }
    }

    public function obtenerVencimientoDocumento(int $id_documento): JsonResponse
    {
        try {

        } catch (\Exception $e) {

        }
    }

    public function obtenerFiltrosUnicos(): JsonResponse
    {
        $statuses = DB::table('documents')
            ->whereNotNull('status')->distinct()->orderBy('status')->pluck('status')->all();

        // TODO: reemplazar este placeholder por una query de verdad que
        // obtenga todos los tipos de documentos presentes en 'documents'
        $docTypes = [0, 1, 2];

        $gaps = DB::table('documents')
            ->whereNotNull('normative_gap')->distinct()->orderBy('normative_gap')->pluck('normative_gap')->all();

        // Mapea aquí tus etiquetas oficiales
        $STATUS_LABELS = [
            0 => 'Vigente',
            1 => 'Vencido',
            2 => 'Por vencer',
        ];
        $DOC_TYPE_LABELS = [
            0 => 'Cédula de identidad',
            1 => 'Mutuos',
            2 => 'Otros',
        ];
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
            $whereParts[] = "d.status IN ($placeholders)";
            // Opcional: castear a int si tu status es entero
            foreach ($status as $s) {
                $whereBinds[] = is_numeric($s) ? (int)$s : $s;
            }
        }

        // TODO: descomentar esto cuando exista, efectivamente, una columna
        // llamada 'doc_type'. Si la columna va a tener otro nombre, entonces
        // hay que reemplazar "d.doc_type IN ($placeholders)"
        // por "d.<COLUMNA> IN ($placeholders)".
        // if (!empty($docType)) {
        //     $placeholders = implode(',', array_fill(0, count($docType), '?'));
        //     $whereParts[] = "d.doc_type IN ($placeholders)";
        //     // Opcional: castear a int si tu docType es entero
        //     foreach ($docType as $s) {
        //         $whereBinds[] = is_numeric($s) ? (int)$s : $s;
        //     }
        // }

        if (!empty($normGap)) {
            $placeholders = implode(',', array_fill(0, count($normGap), '?'));
            $whereParts[] = "d.normative_gap IN ($placeholders)";
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
            $sqlQuery = "
                SELECT
                    sdi.id,
                    sdi.resumen,
                    sdi.archivo,
                    sdi.document_id,
                    sdi.document_group_id,
                    d.filename AS document_name,
                    g.name     AS group_name
                FROM semantic_doc_index sdi
                LEFT JOIN documents d       ON d.id = sdi.document_id
                LEFT JOIN document_groups g ON g.id = sdi.document_group_id
                $whereFiltersSql
                LIMIT ?;
            ";
            $bindings = array_merge($whereBinds, [$limit]);
        } else {
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
                        sdi.document_id,
                        sdi.document_group_id,
                        d.filename AS document_name,
                        g.name     AS group_name,
                        1 - (sdi.embedding <=> ?::vector) AS score
                    FROM semantic_doc_index sdi
                    LEFT JOIN documents d       ON d.id = sdi.document_id
                    LEFT JOIN document_groups g ON g.id = sdi.document_group_id
                    $whereFiltersSql
                ) AS sub
                WHERE score >= ?
                ORDER BY score DESC
                LIMIT ?;
            ";
            $bindings = array_merge([$embeddingStr], $whereBinds, [$minScore, $limit]);
        }

        \Log::info(message: 'Consulta'. $sqlQuery. ' | bindings: ' . json_encode($bindings));

        $resultados = DB::select($sqlQuery, $bindings);

        return response()->json($resultados);
    }


}

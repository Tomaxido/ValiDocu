<?php

namespace App\Http\Controllers;

use App\Support\FlexibleDateParser;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;


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

    public function obtenerDocumentosVencidos(): JsonResponse
    {
        try {
            $documentos = DB::table('semantic_doc_index')->get();
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
                }
                $diasHastaVencimiento = -$diasDesdeVencimiento;
                if ($diasHastaVencimiento < 30) {
                    array_push($documentosPorVencer, $doc);
                }
            }

            return response()->json(array(
                "documentosVencidos" => $documentosVencidos,
                "documentosPorVencer" => $documentosPorVencer,
            ));

        } catch (\Exception $e) {
            \Log::error("❌ Excepción al obtener documentos", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al obtener documentos'], 500);
        }
    }
}

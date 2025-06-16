<?php 

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            SELECT si.id, si.resumen, si.archivo, si.document_id, si.document_group_id,
            d.filename AS document_name, g.name AS group_name,
            1 - (si.embedding <=> ?::vector) as score
            FROM semantic_index si
            JOIN documents d ON d.id = si.document_id
            JOIN document_groups g ON g.id = si.document_group_id
            ORDER BY si.embedding <=> ?::vector
            LIMIT 10;
        ", [$embeddingStr, $embeddingStr]);

        return response()->json($resultados);
    }

    private function generarEmbedding($texto)
    {
        $command = 'wsl -d Ubuntu /home/peto/layoutlmv3_env/bin/python /home/peto/layoutlmv3_env/train_full/scripts/generar_vector.py ' . escapeshellarg($texto);

        $output = shell_exec($command);
        $json = json_decode($output, true);

        if (!is_array($json)) {
            \Log::error("❌ Falló la generación del embedding: " . $output);
            return null;
        }

        return $json;
    }
}
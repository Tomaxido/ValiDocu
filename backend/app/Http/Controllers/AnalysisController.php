<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentAnalysis;
use App\Models\AnalysisIssue;
use App\Models\DocumentFieldSpec;
use App\Services\ValidationService;
use App\Services\SuggestionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Arr;




class AnalysisController extends Controller
{
    public function analyze(int $documentId)
    {
        $doc = Document::findOrFail($documentId);

        // 1) Inferir doc_type desde semantic_index.json_layout (fallback: 'acuerdo')
        $si = DB::table('semantic_index')->where('document_id', $documentId)->first(['json_layout','resumen']);
        $layout = $si ? json_decode($si->json_layout, true) : [];

        $docType = $this->inferDocType($layout) ?? 'acuerdo';
        $summary = $si->resumen ?? null;
        if (!$summary) {
            // Fallback mínimo desde campos normalizados
            $validator = new \App\Services\ValidationService();

            [$fields] = (function($l) use ($validator) {
                $ref = new \ReflectionClass($validator);
                $m = $ref->getMethod('normalize');
                $m->setAccessible(true);
                return $m->invoke($validator, $l);
            })($layout);

            $summary = trim(sprintf(
                'Documento tipo %s entre %s (RUT %s)%s%s.',
                $fields['doc_type_raw'] ?? 'desconocido',
                $fields['nombre_emisor'] ?? 'N/A',
                $fields['rut_emisor'] ?? 'N/A',
                isset($fields['monto_total']) ? (", por un monto de {$fields['monto_total']}") : '',
                isset($fields['fecha']) ? (", fechado el {$fields['fecha']}") : ''
            ));
        }
        $docType = $this->inferDocType($layout) ?? 'acuerdo';

        // 2) Resumen: usa el de semantic_index si existe
        $summary = $si->resumen ?? null;

        // 3) Validación
        $validator = new ValidationService();
        $rawIssues = $validator->validate($docType, $documentId);

        // 4) Persistir análisis e issues
        $analysis = DocumentAnalysis::create([
            'document_id' => $documentId,
            'summary'     => $summary,
            'status'      => 'done',
        ]);

        $sugg = new SuggestionService();

        foreach ($rawIssues as $i) {
            $spec = DocumentFieldSpec::where('doc_type', $docType)->where('field_key', $i['field_key'])->first();

            AnalysisIssue::create([
                'document_analysis_id' => $analysis->id,
                'field_key'            => $i['field_key'],
                'issue_type'           => $i['issue_type'],
                'message'              => $i['message'],
                'suggestion'           => $spec ? $sugg->build($spec, null, ['summary' => $summary]) : null,
                'confidence'           => $i['confidence'] ?? null,
                'evidence'             => $i['evidence'] ?? null,
                'status'               => 'TODO',
            ]);
        }

        // (Opcional) si hay issues, marcar documento como inconforme (status=2)
        if (count($rawIssues) > 0 && Schema::hasColumn($doc->getTable(), 'status')) {
            $doc->update(['status' => 2]);
        }

        return response()->json([
            'analysis_id' => $analysis->id,
            'doc_type'    => $docType,
            'summary'     => $summary,
            'issues'      => $analysis->issues()->get(),
        ]);
    }

    public function showAnalysis(int $documentId, int $analysisId)
    {
        $analysis = DocumentAnalysis::where('document_id', $documentId)->findOrFail($analysisId);
        return response()->json([
            'analysis' => $analysis,
            'issues'   => $analysis->issues()->get(),
        ]);
    }

    public function showLastAnalysis(int $documentId)
    {
        $analysis = DB::table('document_analyses')
            ->where('document_id', $documentId)
            ->orderByDesc('created_at')
            ->first();
        if (!$analysis) {
            return response()->json([
                'message' => 'No existe análisis para este documento'
            ], 404);
        }

        // Traer también los issues relacionados
        $issues = DB::table('analysis_issues')
            ->where('document_analysis_id', $analysis->id)
            ->get();

        return response()->json([
            'analysis' => $analysis,
            'issues'   => $issues,
        ]);
    }

    private function inferDocType(array $layout): ?string
    {
        foreach ($layout as $et) {
            if (($et['label'] ?? '') === 'TIPO_DOCUMENTO') {
                $raw = mb_strtolower(trim((string)($et['text'] ?? '')));
                if (str_contains($raw, 'acuerdo')) return 'acuerdo';
                if (str_contains($raw, 'contrato')) return 'contrato';
                if (str_contains($raw, 'factura')) return 'factura';
                // agrega más mapeos si necesitas
                return $raw ?: null;
            }
        }
        return null;
    }
}

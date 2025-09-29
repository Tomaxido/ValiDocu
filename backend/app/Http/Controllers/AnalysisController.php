<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentAnalysis;
use App\Models\AnalysisIssue;
use App\Models\DocumentFieldSpec;
use App\Services\ValidationService;
use App\Services\SuggestionService;
use App\Services\GroupValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AnalysisController extends Controller
{
    protected GroupValidationService $groupValidationService;

    public function __construct(GroupValidationService $groupValidationService)
    {
        $this->groupValidationService = $groupValidationService;
    }
    public function analyze(int $documentId): JsonResponse
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
            // Buscar doc_type_id basado en el nombre del tipo de documento
            $docTypeId = DB::table('document_types')->where('nombre_doc', $docType)->value('id');
            $spec = DocumentFieldSpec::where('doc_type_id', $docTypeId)->where('field_key', $i['field_key'])->first();

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
            $doc->update(['normative_gap' => 1]);
        }

        return response()->json([
            'analysis_id' => $analysis->id,
            'doc_type'    => $docType,
            'summary'     => $summary,
            'issues'      => $analysis->issues()->get(),
        ]);
    }

    public function createSuggestions(int $documentId): void
    {
        $doc = Document::findOrFail($documentId);
        
        // Obtener el grupo del documento
        $groupId = $doc->group_id;
        if (!$groupId) {
            Log::info("Documento {$documentId} no tiene grupo asociado, omitiendo creación de sugerencias");
            return;
        }

        // 1) Inferir doc_type desde semantic_index.json_layout (fallback: 'acuerdo')
        $si = DB::table('semantic_doc_index')->where('document_id', $documentId)->first(['json_global']);
        $layout = $si ? json_decode($si->json_global, true) : [];

        if (!array_key_exists('TIPO_DOCUMENTO', $layout))
        {
            Log::info("Documento {$documentId} no tiene TIPO_DOCUMENTO en json_global, omitiendo sugerencias");
            return;
        }

        $tipo_documento = $layout['TIPO_DOCUMENTO'];
        // Buscar el ID del tipo de documento basado en el nombre
        $docTypeId = DB::table('document_types')->where('nombre_doc', $tipo_documento)->value('id');
        
        if (!$docTypeId) {
            Log::info("No se encontró tipo de documento para '{$tipo_documento}', omitiendo sugerencias");
            return;
        }
        
        // Obtener configuración específica del grupo para este tipo de documento
        $groupRequiredFields = $this->groupValidationService->getGroupRequiredFields($groupId, $docTypeId);
        
        if (empty($groupRequiredFields)) {
            Log::info("No hay campos obligatorios configurados para el grupo {$groupId} y tipo de documento {$docTypeId}");
            return;
        }
        
        // Obtener solo las especificaciones de campos que están configuradas como obligatorias para este grupo
        $field_specs = DB::table('document_field_specs')
            ->whereIn('id', $groupRequiredFields)
            ->where('doc_type_id', $docTypeId)
            ->get(['id', 'field_key', 'label', 'is_required', 'datatype', 'regex']);

        // ==========================================================
        // 2) Evaluación: existencia y regex contra json_global
        // ==========================================================
        $issues = [];

        foreach ($field_specs as $spec) {
            $key   = (string)$spec->field_key;
            $label = $spec->label ?: $key;

            $exists = array_key_exists($key, $layout);
            $value  = $exists ? $layout[$key] : null;

            // Normalizar a string para validaciones simples
            $strVal = is_scalar($value)
                ? (string)$value
                : (is_null($value) ? '' : json_encode($value, JSON_UNESCAPED_UNICODE));

            // 2.1) Clave faltante (obligatoria para este grupo)
            if (!$exists) {
                // Como ya filtramos por campos obligatorios del grupo, todos los campos son obligatorios
                $issues[] = [
                    'id' => $spec->id,
                    'reason' => 'missing',
                    // 'field_key'  => $key,
                    // 'issue_type' => 'missing_field',
                    // 'message'    => "Falta el campo obligatorio «{$label}» en json_global.",
                    // 'evidence'   => ['path' => $key],
                ];
                // Si no existe, no seguimos evaluando regex
                continue;
            }

            // 2.2) Vacío (obligatorio para este grupo)
            if (trim($strVal) === '') {
                $issues[] = [
                    'id' => $spec->id,
                    'reason' => 'missing'
                    // 'field_key'  => $key,
                    // 'issue_type' => 'blank',
                    // 'message'    => "El campo «{$label}» está vacío.",
                    // 'evidence'   => ['value' => $strVal],
                ];
            }

            // 2.3) Regex (si viene definido y hay valor no vacío)
            if (!empty($spec->regex) && trim($strVal) !== '') {
                $pattern = '#'.$spec->regex.'#u';
                // validar que el patrón sea compilable
                if (@preg_match($pattern, '') !== false) {
                    if (!preg_match($pattern, $strVal)) {
                        $issues[] = [
                            'id' => $spec->id,
                            'reason' => 'invalid'
                            // 'field_key'  => $key,
                            // 'issue_type' => 'invalid_format',
                            // 'message'    => "El campo «{$label}» no cumple el formato esperado.",
                            // 'evidence'   => ['value' => $strVal, 'regex' => $spec->regex],
                        ];
                    }
                } else {
                    // (opcional) patrón inválido en BD
                    // $issues[] = [

                    //     'field_key'  => $key,
                    //     'issue_type' => 'spec_regex_invalid',
                    //     'message'    => "Regex inválido en especificación para «{$label}».",
                    //     'evidence'   => ['regex' => $spec->regex],
                    // ];
                    Log::alert('Se detectó un patron invalido en bd');
                }
            }
        }

        // ==========================================================
        // 3) Guardar issues en DB
        // ==========================================================
        Log::info('Issues: ' . json_encode($issues, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $analysisId = DB::table('document_analyses')->insertGetId([
            'document_id' => $documentId,
            'status' => 'TODO',
            'summary'     => null,
            'meta'        => null,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
        foreach ($issues as $issue) {
            DB::table('analysis_issues')->insert([
                'document_analysis_id' => $analysisId,
                'document_field_spec_id' => $issue['id'],
                'status_id' => 1,
                'reason' => $issue['reason'],
            ]);
        }

        if(!empty($issues)) {
            // Log::warning('Buenasssssss voy a actualizar el normative gap del documento con id ' . $documentId . ' a 1');
            Document::where('id', $documentId)->update(['normative_gap'=> 1]);
        }
    }

    public function showAnalysis(int $documentId, int $analysisId): JsonResponse
    {
        $analysis = DocumentAnalysis::where('document_id', $documentId)->findOrFail($analysisId);
        return response()->json([
            'analysis' => $analysis,
            'issues'   => $analysis->issues()->get(),
        ]);
    }

    public function showLastAnalysis(int $documentId): JsonResponse
    {
        $analysis = DB::table('document_analyses')
            ->where('document_id', $documentId)
            ->orderByDesc('created_at')
            ->first();
        if (!$analysis) {
            return response()->json([
                // 'analysis' => $analysis,
                'issues'   => null,
            ]);
        }

        // Traer también los issues relacionados
        $issues = DB::table('analysis_issues as ai')
            ->join('document_field_specs as dfs', 'ai.document_field_spec_id', '=', 'dfs.id')
            ->where('ai.document_analysis_id', $analysis->id)
            ->select(
                'ai.id as issue_id',
                'ai.status_id',
                'ai.reason',
                'dfs.label',
                'dfs.is_required',
                'dfs.suggestion_template'
            )
            ->get();

        return response()->json([
            // 'analysis' => $analysis,
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

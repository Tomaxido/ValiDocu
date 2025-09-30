<?php

namespace App\Services;

use App\Models\DocumentGroup;
use App\Models\GroupFieldSpec;
use App\Models\DocumentFieldSpec;
use App\Models\DocumentType;
use App\Models\Document;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GroupValidationService
{
    /**
     * Validate uploaded documents against group configuration using group_field_specs.
     */
    public function validateDocumentAgainstGroup(int $groupId, string $documentType, array $detectedLabels): array
    {
        $errors = [];
        
        // Get group's required field specifications for this document type
        $requiredSpecs = $this->getGroupRequiredSpecs($groupId, $documentType);
        
        if (empty($requiredSpecs)) {
            // If no group-specific configuration, fall back to global validation
            return $this->validateAgainstGlobalConfiguration($documentType, $detectedLabels);
        }
        
        // Validate required fields/labels
        foreach ($requiredSpecs as $spec) {
            $fieldKey = $spec->field_key;
            $label = $spec->label;
            
            if (!$this->isLabelDetected($fieldKey, $detectedLabels)) {
                $errors[] = [
                    'type' => 'missing_required_field',
                    'field_key' => $fieldKey,
                    'label' => $label,
                    'message' => "Campo obligatorio '{$label}' ({$fieldKey}) no detectado en el documento."
                ];
            }
        }
        
        return $errors;
    }
    
    /**
     * Alternative method for validating existing Document model
     */
    public function validateDocumentModel(Document $document, DocumentGroup $group): array
    {
        // Get detected labels from semantic_doc_index
        $detectedLabels = DB::table('semantic_doc_index')
            ->where('document_id', $document->id)
            ->select('field_key', 'field_value')
            ->get()
            ->toArray();
            
        return $this->validateDocumentAgainstGroup(
            $group->id,
            $document->documentType->nombre_doc ?? 'Unknown',
            $detectedLabels
        );
    }
    
    /**
     * Get group's required field specifications for a document type.
     */
    public function getGroupRequiredSpecs(int $groupId, string $documentTypeName): array
    {
        // Get document type ID
        $documentType = DocumentType::where('nombre_doc', $documentTypeName)->first();
        if (!$documentType) {
            return [];
        }
        
        // Get group's required field specs for this document type
        return DB::table('group_field_specs as gfs')
            ->join('document_field_specs as dfs', 'gfs.field_spec_id', '=', 'dfs.id')
            ->where('gfs.group_id', $groupId)
            ->where('gfs.document_type_id', $documentType->id)
            ->where('dfs.is_required', true) // Only required fields
            ->select('dfs.field_key', 'dfs.label', 'dfs.datatype', 'dfs.regex')
            ->get()
            ->toArray();
    }
    
    /**
     * Get all document types required for a group.
     */
    public function getGroupRequiredDocumentTypes(int $groupId): array
    {
        return DB::table('group_field_specs as gfs')
            ->join('document_types as dt', 'gfs.document_type_id', '=', 'dt.id')
            ->where('gfs.group_id', $groupId)
            ->select('dt.id', 'dt.nombre_doc')
            ->distinct()
            ->get()
            ->toArray();
    }
    
    /**
     * Check if group has any configuration.
     */
    public function hasGroupConfiguration(int $groupId): bool
    {
        return DB::table('group_field_specs')->where('group_id', $groupId)->exists();
    }
    
    /**
     * Initialize group configuration from global defaults.
     */
    public function initializeGroupConfiguration(int $groupId): void
    {
        // Get all existing document field specs that are required for document types with analizar = 1
        $allSpecs = DB::table('document_field_specs as dfs')
            ->join('document_types as dt', 'dfs.doc_type_id', '=', 'dt.id')
            ->where('dfs.is_required', true)
            ->where('dt.analizar', 1) // Solo tipos de documento que se analizan
            ->select('dfs.id as field_spec_id', 'dt.id as document_type_id')
            ->get();
            
        // Prepare data for bulk insert
        $insertData = [];
        foreach ($allSpecs as $spec) {
            $insertData[] = [
                'group_id' => $groupId,
                'field_spec_id' => $spec->field_spec_id,
                'document_type_id' => $spec->document_type_id
            ];
        }
        
        // Use insert ignore to avoid duplicates
        if (!empty($insertData)) {
            DB::table('group_field_specs')->insertOrIgnore($insertData);
        }
        
        Log::info("Initialized group configuration for group {$groupId} with " . count($allSpecs) . " field specifications (analizar=1 only).");
    }
    
    /**
     * Check if a specific label/field is detected in the document.
     */
    private function isLabelDetected(string $fieldKey, array $detectedLabels): bool
    {
        return in_array($fieldKey, array_column($detectedLabels, 'field_key'));
    }
    
    /**
     * Fallback validation using global configuration.
     */
    private function validateAgainstGlobalConfiguration(string $documentType, array $detectedLabels): array
    {
        $errors = [];
        
        // Get document type ID
        $docType = DocumentType::where('nombre_doc', $documentType)->first();
        if (!$docType) {
            return $errors;
        }
        
        // Get all required fields for this document type globally
        $requiredSpecs = DocumentFieldSpec::where('doc_type_id', $docType->id)
            ->where('is_required', true)
            ->get(['field_key', 'label']);
            
        foreach ($requiredSpecs as $spec) {
            if (!$this->isLabelDetected($spec->field_key, $detectedLabels)) {
                $errors[] = [
                    'type' => 'missing_required_field',
                    'field_key' => $spec->field_key,
                    'label' => $spec->label,
                    'message' => "Campo obligatorio '{$spec->label}' ({$spec->field_key}) no detectado en el documento."
                ];
            }
        }
        
        return $errors;
    }
    
    /**
     * Get IDs of required fields for a specific group and document type.
     */
    public function getGroupRequiredFields(int $groupId, int $documentTypeId): array
    {
        return DB::table('group_field_specs')
            ->where('group_id', $groupId)
            ->where('document_type_id', $documentTypeId)
            ->pluck('field_spec_id')
            ->toArray();
    }
}
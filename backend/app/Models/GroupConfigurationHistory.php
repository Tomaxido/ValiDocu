<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupConfigurationHistory extends Model
{
    use HasFactory;

    protected $table = 'group_configuration_history';

    protected $fillable = [
        'group_id',
        'user_id',
        'action',
        'old_configuration',
        'new_configuration',
        'summary',
        'description',
    ];

    protected $casts = [
        'old_configuration' => 'array',
        'new_configuration' => 'array',
        'summary' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(DocumentGroup::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Crear un registro de historial de configuración
     */
    public static function logConfigurationChange(
        int $groupId,
        string $userId,  // Cambio de int a string para manejar UUID
        string $action,
        ?array $oldConfiguration = null,
        ?array $newConfiguration = null,
        ?string $description = null
    ): self {
        $summary = self::generateChangeSummary($oldConfiguration, $newConfiguration);

        return self::create([
            'group_id' => $groupId,
            'user_id' => $userId,
            'action' => $action,
            'old_configuration' => $oldConfiguration,
            'new_configuration' => $newConfiguration,
            'summary' => $summary,
            'description' => $description,
        ]);
    }

    /**
     * Generar resumen de cambios entre configuraciones
     */
    private static function generateChangeSummary(?array $oldConfig, ?array $newConfig): array
    {
        $summary = [
            'document_types_added' => [],
            'document_types_removed' => [],
            'document_types_modified' => [],
            'fields_changed' => [],
        ];

        if (!$oldConfig || !$newConfig) {
            return $summary;
        }

        $oldDocTypes = array_keys($oldConfig);
        $newDocTypes = array_keys($newConfig);

        // Tipos de documentos añadidos
        $summary['document_types_added'] = array_diff($newDocTypes, $oldDocTypes);

        // Tipos de documentos removidos
        $summary['document_types_removed'] = array_diff($oldDocTypes, $newDocTypes);

        // Tipos de documentos modificados
        foreach ($newDocTypes as $docTypeId) {
            if (isset($oldConfig[$docTypeId]) && $oldConfig[$docTypeId] !== $newConfig[$docTypeId]) {
                $summary['document_types_modified'][] = $docTypeId;

                // Detalle de campos cambiados
                $oldFields = $oldConfig[$docTypeId]['requiredFields'] ?? [];
                $newFields = $newConfig[$docTypeId]['requiredFields'] ?? [];
                $oldRequired = $oldConfig[$docTypeId]['isRequired'] ?? false;
                $newRequired = $newConfig[$docTypeId]['isRequired'] ?? false;

                $fieldChanges = [
                    'document_type_id' => $docTypeId,
                    'required_status_changed' => $oldRequired !== $newRequired,
                    'fields_added' => array_diff($newFields, $oldFields),
                    'fields_removed' => array_diff($oldFields, $newFields),
                ];

                if (!empty($fieldChanges['fields_added']) || 
                    !empty($fieldChanges['fields_removed']) || 
                    $fieldChanges['required_status_changed']) {
                    $summary['fields_changed'][] = $fieldChanges;
                }
            }
        }

        return $summary;
    }

    /**
     * Obtener historial formateado para mostrar en frontend
     */
    public function getFormattedHistoryAttribute(): array
    {
        $formattedSummary = $this->getFormattedSummaryWithNames();
        
        return [
            'id' => $this->id,
            'action' => $this->action,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ],
            'summary' => $formattedSummary,
            'description' => $this->description,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'created_at_human' => $this->created_at->diffForHumans(),
        ];
    }

    /**
     * Obtener resumen con nombres en lugar de IDs
     */
    private function getFormattedSummaryWithNames(): array
    {
        $summary = $this->summary;
        if (!$summary) {
            return [];
        }

        // Obtener nombres de tipos de documento
        $documentTypeIds = array_merge(
            $summary['document_types_added'] ?? [],
            $summary['document_types_removed'] ?? [],
            $summary['document_types_modified'] ?? []
        );
        
        $documentTypes = [];
        if (!empty($documentTypeIds)) {
            $documentTypes = \App\Models\DocumentType::whereIn('id', $documentTypeIds)
                ->get()
                ->keyBy('id')
                ->toArray();
        }

        // Obtener nombres de campos
        $fieldIds = [];
        foreach ($summary['fields_changed'] ?? [] as $fieldChange) {
            $fieldIds = array_merge(
                $fieldIds,
                $fieldChange['fields_added'] ?? [],
                $fieldChange['fields_removed'] ?? []
            );
        }
        
        $fieldSpecs = [];
        if (!empty($fieldIds)) {
            $fieldSpecs = \App\Models\DocumentFieldSpec::whereIn('id', $fieldIds)
                ->get()
                ->keyBy('id')
                ->toArray();
        }

        // Formatear resumen con nombres
        $formattedSummary = [
            'document_types_added' => [],
            'document_types_removed' => [],
            'document_types_modified' => [],
            'fields_changed' => [],
        ];

        // Tipos de documento añadidos
        foreach ($summary['document_types_added'] ?? [] as $docTypeId) {
            $formattedSummary['document_types_added'][] = [
                'id' => $docTypeId,
                'name' => $documentTypes[$docTypeId]['nombre_doc'] ?? "Tipo $docTypeId"
            ];
        }

        // Tipos de documento removidos
        foreach ($summary['document_types_removed'] ?? [] as $docTypeId) {
            $formattedSummary['document_types_removed'][] = [
                'id' => $docTypeId,
                'name' => $documentTypes[$docTypeId]['nombre_doc'] ?? "Tipo $docTypeId"
            ];
        }

        // Tipos de documento modificados
        foreach ($summary['document_types_modified'] ?? [] as $docTypeId) {
            $formattedSummary['document_types_modified'][] = [
                'id' => $docTypeId,
                'name' => $documentTypes[$docTypeId]['nombre_doc'] ?? "Tipo $docTypeId"
            ];
        }

        // Cambios en campos
        foreach ($summary['fields_changed'] ?? [] as $fieldChange) {
            $docTypeId = $fieldChange['document_type_id'];
            
            $formattedFieldChange = [
                'document_type_id' => $docTypeId,
                'document_type_name' => $documentTypes[$docTypeId]['nombre_doc'] ?? "Tipo $docTypeId",
                'required_status_changed' => $fieldChange['required_status_changed'],
                'fields_added' => [],
                'fields_removed' => [],
            ];

            // Campos añadidos
            foreach ($fieldChange['fields_added'] ?? [] as $fieldId) {
                $formattedFieldChange['fields_added'][] = [
                    'id' => $fieldId,
                    'name' => $fieldSpecs[$fieldId]['label'] ?? "Campo $fieldId"
                ];
            }

            // Campos removidos
            foreach ($fieldChange['fields_removed'] ?? [] as $fieldId) {
                $formattedFieldChange['fields_removed'][] = [
                    'id' => $fieldId,
                    'name' => $fieldSpecs[$fieldId]['label'] ?? "Campo $fieldId"
                ];
            }

            $formattedSummary['fields_changed'][] = $formattedFieldChange;
        }

        return $formattedSummary;
    }
}
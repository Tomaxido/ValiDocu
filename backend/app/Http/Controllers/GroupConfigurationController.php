<?php

namespace App\Http\Controllers;

use App\Models\DocumentGroup;
use App\Models\DocumentType;
use App\Models\DocumentFieldSpec;
use App\Models\GroupFieldSpec;
use App\Services\GroupValidationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class GroupConfigurationController extends Controller
{
    protected $validationService;
    
    public function __construct(GroupValidationService $validationService)
    {
        $this->validationService = $validationService;
    }

    /**
     * Obtener la configuración completa de un grupo basada en group_field_specs
     */
    public function show(int $groupId): JsonResponse
    {
        $group = DocumentGroup::findOrFail($groupId);
        
        // Obtener configuración del grupo
        $configuration = $this->getGroupConfiguration($groupId);
        
        return response()->json([
            'group' => $group,
            'configuration' => $configuration,
            'has_configuration' => $this->validationService->hasGroupConfiguration($groupId)
        ]);
    }

    /**
     * Obtener todos los tipos de documentos disponibles para configuración (analizar = 1)
     */
    public function getAllAvailableDocumentTypes(): JsonResponse
    {
        // Tipos de documentos disponibles - solo los que tienen analizar = 1
        $documentTypes = DocumentType::with(['fieldSpecs' => function($query) {
            $query->where('is_required', true);
        }])->where('analizar', 1)->get();
        
        return response()->json([
            'document_types' => $documentTypes
        ]);
    }

    /**
     * Obtener tipos de documentos disponibles y su configuración
     */
    public function getAvailableDocumentTypes(int $groupId): JsonResponse
    {
        $group = DocumentGroup::findOrFail($groupId);
        
        // Tipos de documentos disponibles - solo los que tienen analizar = 1
        $documentTypes = DocumentType::with(['fieldSpecs' => function($query) {
            $query->where('is_required', true);
        }])->where('analizar', 1)->get();
        
        // Configuración actual del grupo
        $groupConfiguration = $this->getGroupConfiguration($groupId);
        
        return response()->json([
            'document_types' => $documentTypes,
            'group_configuration' => $groupConfiguration
        ]);
    }

    /**
     * Actualizar configuración de tipos de documentos y campos obligatorios para el grupo
     */
    public function updateGroupConfiguration(Request $request, int $groupId): JsonResponse
    {
        // La nueva estructura del frontend envía un objeto con claves numéricas (document_type_id)
        // y valores con isRequired y requiredFields
        $validator = Validator::make($request->all(), [
            'configurations' => 'required|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error en la validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $group = DocumentGroup::findOrFail($groupId);
        
        DB::beginTransaction();
        try {
            // Eliminar configuración existente
            DB::table('group_field_specs')->where('group_id', $groupId)->delete();
            
            // Preparar datos para inserción masiva
            $insertData = [];
            $configurations = $request->input('configurations', []);
            
            foreach ($configurations as $documentTypeId => $config) {
                // Solo procesar tipos de documento marcados como obligatorios
                if (isset($config['isRequired']) && $config['isRequired']) {
                    $requiredFields = $config['requiredFields'] ?? [];
                    
                    foreach ($requiredFields as $fieldSpecId) {
                        $insertData[] = [
                            'group_id' => $groupId,
                            'field_spec_id' => $fieldSpecId,
                            'document_type_id' => $documentTypeId
                        ];
                    }
                }
            }
            
            // Insertar nueva configuración
            if (!empty($insertData)) {
                DB::table('group_field_specs')->insert($insertData);
            }
            
            DB::commit();
            
            Log::info("Updated group configuration for group {$groupId}", [
                'user_id' => auth()->id(),
                'document_types_configured' => count(array_filter($configurations, fn($config) => $config['isRequired'] ?? false))
            ]);
            
            return response()->json([
                'message' => 'Configuración actualizada exitosamente',
                'configuration' => $this->getGroupConfiguration($groupId)
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error("Error updating group configuration for group {$groupId}", [
                'error' => $e->getMessage(),
                'user_id' => auth()->id()
            ]);
            
            return response()->json([
                'message' => 'Error al actualizar la configuración',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Inicializar configuración por defecto para el grupo
     */
    public function initializeGroupConfiguration(int $groupId): JsonResponse
    {
        $group = DocumentGroup::findOrFail($groupId);
        
        try {
            $this->validationService->initializeGroupConfiguration($groupId);
            
            return response()->json([
                'message' => 'Configuración inicializada exitosamente',
                'configuration' => $this->getGroupConfiguration($groupId)
            ]);
            
        } catch (\Exception $e) {
            Log::error("Error initializing group configuration for group {$groupId}", [
                'error' => $e->getMessage(),
                'user_id' => auth()->id()
            ]);
            
            return response()->json([
                'message' => 'Error al inicializar la configuración',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener configuración por defecto del sistema
     */
    public function getDefaultConfiguration(): JsonResponse
    {
        $defaultConfiguration = [];
        
        // Obtener todos los tipos de documentos con sus campos requeridos
        $documentTypes = DocumentType::with(['fieldSpecs' => function($query) {
            $query->where('is_required', true);
        }])->get();
        
        foreach ($documentTypes as $docType) {
            $defaultConfiguration[] = [
                'document_type_id' => $docType->id,
                'document_type_name' => $docType->nombre_doc,
                'required_fields' => $docType->fieldSpecs->map(function($spec) {
                    return [
                        'id' => $spec->id,
                        'field_key' => $spec->field_key,
                        'label' => $spec->label,
                        'datatype' => $spec->datatype
                    ];
                })
            ];
        }
        
        return response()->json([
            'default_configuration' => $defaultConfiguration
        ]);
    }

    /**
     * Método privado para obtener la configuración actual del grupo
     */
    private function getGroupConfiguration(int $groupId): array
    {
        return DB::table('group_field_specs as gfs')
            ->join('document_types as dt', 'gfs.document_type_id', '=', 'dt.id')
            ->join('document_field_specs as dfs', 'gfs.field_spec_id', '=', 'dfs.id')
            ->where('gfs.group_id', $groupId)
            ->select(
                'dt.id as document_type_id',
                'dt.nombre_doc as document_type_name',
                'dfs.id as field_spec_id',
                'dfs.field_key',
                'dfs.label',
                'dfs.datatype',
                'dfs.is_required'
            )
            ->get()
            ->groupBy('document_type_id')
            ->map(function($fields, $docTypeId) {
                $firstField = $fields->first();
                return [
                    'document_type_id' => $docTypeId,
                    'document_type_name' => $firstField->document_type_name,
                    'required_fields' => $fields->map(function($field) {
                        return [
                            'field_spec_id' => $field->field_spec_id,
                            'field_key' => $field->field_key,
                            'label' => $field->label,
                            'datatype' => $field->datatype,
                            'is_required' => $field->is_required
                        ];
                    })->values()
                ];
            })
            ->values()
            ->toArray();
    }
}


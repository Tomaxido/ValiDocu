<?php

namespace App\Http\Controllers;

use App\Models\DocumentGroup;
use App\Models\DocumentType;
use App\Models\DocumentFieldSpec;
use App\Models\GroupFieldSpec;
use App\Models\GroupConfigurationHistory;
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
     * Obtener todos los tipos de documentos disponibles para configuración
     */
    public function getAllAvailableDocumentTypes(): JsonResponse
    {
        try {
            // TODOS los tipos de documentos con sus especificaciones de campos
            $documentTypes = DocumentType::with('fieldSpecs')->get();
            
            // Transformar para incluir field_specs en snake_case para el frontend
            $documentTypes = $documentTypes->map(function ($docType) {
                $docTypeArray = $docType->toArray();
                $docTypeArray['field_specs'] = $docType->fieldSpecs->toArray();
                return $docTypeArray;
            });
            
            // Campos globales para documentos con analizar = 1
            $globalFields = DocumentFieldSpec::where('is_required', true)->get();
            
            return response()->json([
                'document_types' => $documentTypes,
                'global_fields' => $globalFields
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getAllAvailableDocumentTypes: ' . $e->getMessage());
            return response()->json([
                'error' => 'Error al obtener tipos de documentos',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener tipos de documentos disponibles y su configuración
     */
    public function getAvailableDocumentTypes(int $groupId): JsonResponse
    {
        $group = DocumentGroup::findOrFail($groupId);
        
        // TODOS los tipos de documentos
        $documentTypes = DocumentType::get();
        
        // Campos globales para documentos con analizar = 1
        $globalFields = DocumentFieldSpec::where('is_required', true)->get();
        
        // Configuración actual del grupo
        $groupConfiguration = $this->getGroupConfiguration($groupId);
        
        return response()->json([
            'document_types' => $documentTypes,
            'global_fields' => $globalFields,
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
        
        // Obtener la configuración anterior para el historial
        $oldConfiguration = $this->getCurrentConfigurationForHistory($groupId);
        $newConfigurations = $request->input('configurations', []);
        
        DB::beginTransaction();
        try {
            // Eliminar configuración existente
            DB::table('group_field_specs')->where('group_id', $groupId)->delete();
            
            // Preparar datos para inserción masiva
            $insertData = [];
            
            foreach ($newConfigurations as $documentTypeId => $config) {
                // Solo procesar tipos de documento marcados como obligatorios
                if (isset($config['isRequired']) && $config['isRequired']) {
                    
                    // Verificar si el tipo de documento tiene análisis
                    $docType = \App\Models\DocumentType::find($documentTypeId);
                    
                    if ($docType && $docType->analizar == 1) {
                        // Para documentos con análisis, usar campos globales seleccionados
                        $requiredFields = $config['requiredFields'] ?? [];
                        
                        if (!empty($requiredFields)) {
                            foreach ($requiredFields as $fieldSpecId) {
                                // Verificar que el field_spec_id existe antes de insertar
                                $fieldExists = DB::table('document_field_specs')->where('id', $fieldSpecId)->exists();
                                if ($fieldExists) {
                                    $insertData[] = [
                                        'group_id' => $groupId,
                                        'field_spec_id' => $fieldSpecId,
                                        'document_type_id' => $documentTypeId
                                    ];
                                }
                            }
                        }
                    } else {
                        // Para documentos sin análisis (analizar = 0)
                        // Usar field_spec_id = NULL para indicar que es obligatorio pero sin campos específicos
                        $insertData[] = [
                            'group_id' => $groupId,
                            'field_spec_id' => null,
                            'document_type_id' => $documentTypeId
                        ];
                        
                        Log::info("Marcando documento tipo {$documentTypeId} como obligatorio sin campos específicos (analizar=0)");
                    }
                }
            }
            
            // Insertar nueva configuración
            if (!empty($insertData)) {
                try {
                    DB::table('group_field_specs')->insert($insertData);
                } catch (\Illuminate\Database\QueryException $e) {
                    // Si hay un error de foreign key, registrarlo y fallar graciosamente
                    if ($e->getCode() == '23503') { // Código PostgreSQL para foreign key violation
                        Log::error('Foreign key violation in group_field_specs', [
                            'error' => $e->getMessage(),
                            'insertData' => $insertData
                        ]);
                        throw new \Exception('Error de configuración: Algunos campos seleccionados no existen. Por favor, actualice la página e intente nuevamente.');
                    }
                    throw $e;
                }
            }
            
            // Registrar cambio en el historial solo si hay cambios reales
            $userId = auth()->id();
            if ($userId && $this->hasRealChanges($oldConfiguration, $newConfigurations)) {
                GroupConfigurationHistory::logConfigurationChange(
                    $groupId,
                    $userId,
                    empty($oldConfiguration) ? 'created' : 'updated',
                    $oldConfiguration,
                    $newConfigurations,
                    'Configuración actualizada desde el panel de administración'
                );
            }
            
            DB::commit();
            
            Log::info("Updated group configuration for group {$groupId}", [
                'user_id' => $userId,
                'document_types_configured' => count(array_filter($newConfigurations, fn($config) => $config['isRequired'] ?? false))
            ]);
            
            // Regenerar sugerencias para todos los documentos del grupo
            try {
                $analysisController = app(\App\Http\Controllers\AnalysisController::class);
                $analysisController->regenerateGroupSuggestions($groupId);
                Log::info("Sugerencias regeneradas para grupo {$groupId} después de actualizar configuración");
            } catch (\Exception $e) {
                Log::error("Error regenerando sugerencias para grupo {$groupId}: " . $e->getMessage());
                // No fallar la actualización de configuración si falla la regeneración
            }
            
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
     * Obtener historial de cambios de configuración del grupo
     */
    public function getConfigurationHistory(int $groupId): JsonResponse
    {
        $group = DocumentGroup::findOrFail($groupId);
        
        $history = GroupConfigurationHistory::with('user')
            ->where('group_id', $groupId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($entry) {
                return $entry->formatted_history;
            });
            
        return response()->json([
            'history' => $history
        ]);
    }

    /**
     * Método privado para obtener la configuración actual del grupo
     */
    private function getGroupConfiguration(int $groupId): array
    {
        $configuration = [];
        
        // Obtener configuraciones con campos específicos (documentos con analizar = 1)
        $configurationsWithFields = DB::table('group_field_specs as gfs')
            ->join('document_types as dt', 'gfs.document_type_id', '=', 'dt.id')
            ->join('document_field_specs as dfs', 'gfs.field_spec_id', '=', 'dfs.id')
            ->where('gfs.group_id', $groupId)
            ->whereNotNull('gfs.field_spec_id')
            ->where('dt.analizar', 1)
            ->select(
                'dt.id as document_type_id',
                'dt.nombre_doc as document_type_name',
                'dt.analizar',
                'dfs.id as field_spec_id'
            )
            ->get()
            ->groupBy('document_type_id');
            
        // Obtener configuraciones sin campos específicos (analizar = 0)
        $configurationsWithoutFields = DB::table('group_field_specs as gfs')
            ->join('document_types as dt', 'gfs.document_type_id', '=', 'dt.id')
            ->where('gfs.group_id', $groupId)
            ->whereNull('gfs.field_spec_id')
            ->where('dt.analizar', 0)
            ->select(
                'dt.id as document_type_id',
                'dt.nombre_doc as document_type_name',
                'dt.analizar'
            )
            ->get()
            ->keyBy('document_type_id');
        
        // Procesar configuraciones con campos (analizar = 1)
        foreach ($configurationsWithFields as $docTypeId => $fields) {
            $firstField = $fields->first();
            
            // Obtener los campos específicos para este tipo de documento
            $specificFieldIds = $fields->pluck('field_spec_id')->unique();
            $requiredFields = DB::table('document_field_specs')
                ->whereIn('id', $specificFieldIds)
                ->where('is_required', true)
                ->select('id as field_spec_id', 'field_key', 'label', 'datatype', 'is_required')
                ->get()
                ->toArray();
            
            $configuration[] = [
                'document_type_id' => $docTypeId,
                'document_type_name' => $firstField->document_type_name,
                'analizar' => $firstField->analizar,
                'required_fields' => $requiredFields  // Campos específicos para este documento
            ];
        }
        
        // Procesar configuraciones sin campos (analizar = 0)
        foreach ($configurationsWithoutFields as $docTypeId => $docType) {
            $configuration[] = [
                'document_type_id' => $docTypeId,
                'document_type_name' => $docType->document_type_name,
                'analizar' => $docType->analizar,
                'required_fields' => []
            ];
        }
        
        return $configuration;
    }

    /**
     * Obtener la configuración actual en formato para historial
     */
    private function getCurrentConfigurationForHistory(int $groupId): array
    {
        $configuration = [];
        
        $groupSpecs = DB::table('group_field_specs as gfs')
            ->join('document_types as dt', 'gfs.document_type_id', '=', 'dt.id')
            ->where('gfs.group_id', $groupId)
            ->select('gfs.document_type_id', 'gfs.field_spec_id')
            ->get()
            ->groupBy('document_type_id');

        foreach ($groupSpecs as $documentTypeId => $specs) {
            $fieldIds = $specs->pluck('field_spec_id')->filter()->map('intval')->toArray();
            
            $configuration[$documentTypeId] = [
                'isRequired' => true,
                'requiredFields' => $fieldIds  // Vacío para documentos con analizar=0
            ];
        }

        return $configuration;
    }

    /**
     * Verificar si hay cambios reales entre configuraciones
     */
    private function hasRealChanges(?array $oldConfig, ?array $newConfig): bool
    {
        // Normalizar ambas configuraciones
        $oldNormalized = $this->normalizeForComparison($oldConfig);
        $newNormalized = $this->normalizeForComparison($newConfig);
        
        // Usar serialize para comparación más confiable
        return serialize($oldNormalized) !== serialize($newNormalized);
    }

    /**
     * Normalizar configuración para comparación
     */
    private function normalizeForComparison(?array $config): array
    {
        if (empty($config)) {
            return [];
        }

        $normalized = [];
        
        foreach ($config as $docTypeId => $typeConfig) {
            if (isset($typeConfig['isRequired']) && $typeConfig['isRequired'] === true) {
                $requiredFields = $typeConfig['requiredFields'] ?? [];
                if (!empty($requiredFields)) {
                    $fieldIds = array_map('intval', array_filter($requiredFields, 'is_numeric'));
                    sort($fieldIds);
                    $normalized[(int)$docTypeId] = [
                        'isRequired' => true,
                        'requiredFields' => $fieldIds
                    ];
                }
            }
        }

        ksort($normalized);
        return $normalized;
    }
}


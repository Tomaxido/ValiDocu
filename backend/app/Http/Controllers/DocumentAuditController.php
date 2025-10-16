<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentAuditLog;
use App\Traits\CreatesDocumentAuditLogs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Log;

/**
 * DocumentAuditController
 * 
 * Controlador para gestionar la trazabilidad y auditoría de documentos.
 * Proporciona endpoints para consultar el historial de acciones sobre documentos.
 */
class DocumentAuditController extends Controller
{
    use CreatesDocumentAuditLogs;
    /**
     * Obtener el timeline completo de un documento
     * 
     * @param int $documentId
     * @return JsonResponse
     */
    public function getDocumentTimeline(int $documentId): JsonResponse
    {
        try {
            // Verificar que el documento existe
            $document = Document::findOrFail($documentId);

            // Obtener el timeline con todas las relaciones
            $timeline = DocumentAuditLog::forDocument($documentId)
                ->withRelations()
                ->chronological()
                ->get();

            $versions = $document->versions()->orderBy('version_number', 'desc')->get();
            Log::info('Fetched versions: ' . json_encode($versions));

            // Transformar los datos para la respuesta
            $timelineData = $timeline->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'action_label' => $log->action_label,
                    'comment' => $log->comment,
                    'metadata' => $log->metadata,
                    'created_at' => $log->created_at->toISOString(),
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                    ] : null,
                    'document_version' => $log->documentVersion ? [
                        'id' => $log->documentVersion->id,
                        'version_number' => $log->documentVersion->version_number,
                        'filename' => $log->documentVersion->filename,
                        'file_size' => $log->documentVersion->file_size,
                    ] : null,
                    'ip_address' => $log->ip_address,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'document' => [
                        'id' => $document->id,
                        'document_group' => $document->documentGroup->name ?? null,
                        'document_type' => $document->documentType->name ?? null,
                        'status' => $document->status,
                    ],
                    'timeline' => $timelineData,
                    'total_events' => $timeline->count(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching document timeline', ['error' => $e->getMessage(), 'document_id' => $documentId]);
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el timeline del documento',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener el historial de versiones de un documento con sus logs
     * 
     * @param int $documentId
     * @return JsonResponse
     */
    public function getDocumentVersionHistory(int $documentId): JsonResponse
    {
        try {
            $document = Document::with(['versions' => function ($query) {
                $query->orderBy('version_number', 'desc');
            }])->findOrFail($documentId);

            // Obtener logs agrupados por versión
            $versionHistory = $document->versions->map(function ($version) {
                return [
                    'version' => [
                        'id' => $version->id,
                        'version_number' => $version->version_number,
                        'filename' => $version->filename,
                        'file_size' => $version->file_size,
                        'is_current' => $version->is_current,
                        'comment' => $version->comment,
                        'uploaded_at' => $version->created_at->toISOString(),
                        'uploaded_by' => $version->uploader ? [
                            // 'id' => $version->uploader->id,
                            'name' => $version->uploader->name,
                            'email' => $version->uploader->email,
                        ] : null,
                    ],
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'document' => [
                        'id' => $document->id,
                        'document_group' => $document->documentGroup->name ?? null,
                        'document_type' => $document->documentType->name ?? null,
                        'status' => $document->status,
                    ],
                    'version_history' => $versionHistory,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el historial de versiones',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de actividad de un documento
     * 
     * @param int $documentId
     * @return JsonResponse
     */
    public function getDocumentActivityStats(int $documentId): JsonResponse
    {
        try {
            $document = Document::findOrFail($documentId);

            // Estadísticas por acción
            $actionStats = DocumentAuditLog::forDocument($documentId)
                ->select('action', DB::raw('COUNT(*) as count'))
                ->groupBy('action')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->action => $item->count];
                });

            // Usuarios más activos
            $userActivity = DocumentAuditLog::forDocument($documentId)
                ->whereNotNull('user_id')
                ->with('user')
                ->select('user_id', DB::raw('COUNT(*) as count'))
                ->groupBy('user_id')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($item) {
                    return [
                        'user' => [
                            'id' => $item->user->id,
                            'name' => $item->user->name,
                            'email' => $item->user->email,
                        ],
                        'activity_count' => $item->count,
                    ];
                });

            // Actividad por fecha (últimos 30 días)
            $activityByDate = DocumentAuditLog::forDocument($documentId)
                ->where('created_at', '>=', now()->subDays(30))
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'document_id' => $documentId,
                    'total_events' => DocumentAuditLog::forDocument($documentId)->count(),
                    'action_stats' => $actionStats,
                    'user_activity' => $userActivity,
                    'activity_by_date' => $activityByDate,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas de actividad',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener logs de auditoría con filtros
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getAuditLogs(Request $request): JsonResponse
    {
        try {
            $query = DocumentAuditLog::withRelations();

            // Filtro por documento
            if ($request->has('document_id')) {
                $query->forDocument($request->document_id);
            }

            // Filtro por usuario
            if ($request->has('user_id')) {
                $query->forUser($request->user_id);
            }

            // Filtro por acción
            if ($request->has('action')) {
                $query->forAction($request->action);
            }

            // Filtro por rango de fechas
            if ($request->has('date_from')) {
                $query->where('created_at', '>=', $request->date_from);
            }
            if ($request->has('date_to')) {
                $query->where('created_at', '<=', $request->date_to);
            }

            // Ordenar cronológicamente
            $query->chronological();

            // Paginación
            $perPage = $request->get('per_page', 50);
            $logs = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $logs,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener logs de auditoría',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener acciones disponibles para filtros
     * 
     * @return JsonResponse
     */
    public function getAvailableActions(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'actions' => DocumentAuditLog::getAvailableActions(),
                'action_labels' => DocumentAuditLog::getActionLabels(),
            ],
        ]);
    }

    /**
     * Descargar una versión específica de un documento
     * 
     * @param int $documentId
     * @param int $versionId
     * @return JsonResponse
     */
    public function downloadDocumentVersion(int $documentId, int $versionId): JsonResponse
    {
        try {
            $document = Document::findOrFail($documentId);
            $version = $document->versions()->findOrFail($versionId);

            // Registrar la descarga en el audit log usando el trait
            $this->logDocumentDownloaded(
                documentId: $documentId,
                documentVersionId: $versionId,
                comment: "Versión {$version->version_number} descargada",
                metadata: [
                    'version_number' => $version->version_number,
                    'filename' => $version->filename,
                    'file_size' => $version->file_size,
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'download_url' => url('/secure-pdf/' . basename($version->filepath)),
                    'filename' => $version->filename,
                    'version_number' => $version->version_number,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error downloading document version', [
                'error' => $e->getMessage(),
                'document_id' => $documentId,
                'version_id' => $versionId
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar la versión del documento',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
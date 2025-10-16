<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DocumentUploadController;
use App\Http\Controllers\SemanticController;
use App\Http\Controllers\AnalysisController;
use App\Http\Controllers\IssueController;
use App\Http\Controllers\DocumentSummaryController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GroupConfigurationController;
use App\Http\Controllers\GroupAccessRequestController;
use App\Http\Controllers\DocumentAuditController;

Route::prefix('v1')->group(function () {
    
    Route::post('/login', [AuthController::class, 'login']); // ->middleware(['throttle:6,1']); // rate limit básico
    Route::post('/logout', [AuthController::class, 'logout'])->middleware(['auth:sanctum']);
    Route::get('/me', [AuthController::class, 'me'])->middleware(['auth:sanctum']);
    Route::get('/users/search', [AuthController::class, 'searchUsers'])->middleware(['auth:sanctum']);
    

    Route::get('/documents', [DocumentUploadController::class, 'index'])->middleware(['auth:sanctum']);
    Route::get('/documents/{id}', [DocumentUploadController::class, 'show'])->middleware(['auth:sanctum']);
    Route::post('/documents/{id}/version', [DocumentUploadController::class, 'uploadNewVersion'])->middleware(['auth:sanctum']);
    Route::get('/documents/{documentId}/version/{versionId}/page/{pageId}/layout', [SemanticController::class, 'buscarJsonLayoutByDocumentId']);
    Route::get('/documents/{id}/layout-doc', [SemanticController::class, 'buscaDocJsonLayoutByDocumentId']);
    Route::get('/documentos_vencidos', [SemanticController::class, 'obtenerDocumentosVencidos']);
    Route::get('/documents/group/{group_id}/vencidos', [SemanticController::class, 'obtenerDocumentosVencidosDeGrupo']);
    Route::get('/documents/{id}/vencimiento', [SemanticController::class, 'obtenerVencimientoDocumento']);
    // Valores únicos para filtros (status y normative_gap)
    Route::get('/document-filters', [SemanticController::class, 'obtenerFiltrosUnicos']);
    // Búsqueda semántica con filtros (status / normative_gap opcionales)

    Route::post('/documentos_vencidos', [SemanticController::class, 'marcarDocumentosVencidos']);
    Route::post('/documents', [DocumentUploadController::class, 'storeNewGroup'])->middleware(['auth:sanctum']);
    Route::post('/documents/{group_id}', [DocumentUploadController::class, 'addToGroup'])->middleware(['auth:sanctum']);

    Route::delete('/documents/file/{id}', [DocumentUploadController::class, 'destroyFile']);
    Route::delete('/documents/group/{id}', [DocumentUploadController::class, 'destroyGroup']);

    Route::post('/buscar-similar', [SemanticController::class, 'buscarSimilares']);
    Route::post('/buscar-similar-filtros', [SemanticController::class, 'buscarSimilaresConFiltros']);
    Route::post('/semantic-data/by-filenames', [DocumentUploadController::class, 'getSemanticDataByFilenames']);

    Route::post('/documents/{id}/analyze', [AnalysisController::class, 'analyze']);
    Route::get('/documents/{id}/analysis', [AnalysisController::class, 'showLastAnalysis']);
    Route::get('/documents/{id}/analysis/{analysis}', [AnalysisController::class, 'showAnalysis']);

    Route::patch('/issues/{id}', [IssueController::class, 'update']);
    Route::get('/suggestion-status', [IssueController::class, 'indexStatuses']);
    Route::patch('/issues/{issue}/status', [IssueController::class, 'updateStatus']);

    Route::get('/documents/{groupId}/summary-excel', [DocumentSummaryController::class, 'downloadGroupSummaryExcel']);
    Route::get('/groups/{groupId}/overview', [DocumentSummaryController::class, 'overviewJson']);
    Route::get('/mandatory-docs', [DocumentSummaryController::class, 'mandatoryDocs']);
    Route::get('/document-summary/{document_id}', [App\Http\Controllers\DocumentUploadController::class, 'getDocumentSummary']);
    Route::get('/documents/{documentId}/missing-fields', [AnalysisController::class, 'getMissingFields']);
    
    // Gestión de usuarios en grupos
    Route::post('/groups/{group_id}/users', [DocumentUploadController::class, 'addUserToGroup'])->middleware(['auth:sanctum']);
    Route::put('/groups/{group_id}/users/{user_id}/status', [DocumentUploadController::class, 'updateUserStatus'])->middleware(['auth:sanctum']);
    Route::get('/groups/{group_id}/pending-users', [DocumentUploadController::class, 'getPendingUsers'])->middleware(['auth:sanctum']);

    // Configuración de grupos - documentos y etiquetas obligatorias
    Route::get('/document-types/available', [GroupConfigurationController::class, 'getAllAvailableDocumentTypes'])->middleware(['auth:sanctum']);
    Route::get('/groups/{group_id}/configuration', [GroupConfigurationController::class, 'show'])->middleware(['auth:sanctum']);
    Route::get('/groups/{group_id}/document-types', [GroupConfigurationController::class, 'getAvailableDocumentTypes'])->middleware(['auth:sanctum']);
    Route::put('/groups/{group_id}/configuration', [GroupConfigurationController::class, 'updateGroupConfiguration'])->middleware(['auth:sanctum']);
    Route::get('/groups/configuration/defaults', [GroupConfigurationController::class, 'getDefaultConfiguration'])->middleware(['auth:sanctum']);
    Route::post('/groups/{group_id}/initialize-configuration', [GroupConfigurationController::class, 'initializeGroupConfiguration'])->middleware(['auth:sanctum']);
    Route::get('/groups/{group_id}/configuration/history', [GroupConfigurationController::class, 'getConfigurationHistory'])->middleware(['auth:sanctum']);

    // Gestión de solicitudes de acceso a grupos privados
    Route::post('/groups/{group_id}/request-access', [GroupAccessRequestController::class, 'requestAccess'])->middleware(['auth:sanctum']);
    Route::get('/admin/access-requests/pending', [GroupAccessRequestController::class, 'getPendingRequests'])->middleware(['auth:sanctum']);
    Route::patch('/admin/access-requests/{request_id}/review', [GroupAccessRequestController::class, 'reviewRequest'])->middleware(['auth:sanctum']);
    Route::get('/groups/{group_id}/access-requests', [GroupAccessRequestController::class, 'getGroupRequestHistory'])->middleware(['auth:sanctum']);
    Route::get('/my-access-requests', [GroupAccessRequestController::class, 'getMyRequests'])->middleware(['auth:sanctum']);

    // Información detallada de grupos
    Route::get('/groups/{group_id}/details', [DocumentUploadController::class, 'getGroupDetails'])->middleware(['auth:sanctum']);
    Route::get('/groups/{group_id}/members', [DocumentUploadController::class, 'getGroupMembers'])->middleware(['auth:sanctum']);

    // Rutas para auditoría y trazabilidad de documentos
    Route::get('/documents/{document_id}/timeline', [DocumentAuditController::class, 'getDocumentTimeline'])->middleware(['auth:sanctum']);
    Route::get('/documents/{document_id}/version-history', [DocumentAuditController::class, 'getDocumentVersionHistory'])->middleware(['auth:sanctum']);
    Route::get('/documents/{document_id}/activity-stats', [DocumentAuditController::class, 'getDocumentActivityStats'])->middleware(['auth:sanctum']);
    Route::get('/documents/{document_id}/versions/{version_id}/download', [DocumentAuditController::class, 'downloadDocumentVersion'])->middleware(['auth:sanctum']);
    Route::get('/audit-logs', [DocumentAuditController::class, 'getAuditLogs'])->middleware(['auth:sanctum']);
    Route::get('/audit/actions', [DocumentAuditController::class, 'getAvailableActions'])->middleware(['auth:sanctum']);

    // Endpoint para testing de eventos WebSocket
    Route::post('/test/documents-processed-event', [DocumentUploadController::class, 'testDocumentsProcessedEvent']);

});

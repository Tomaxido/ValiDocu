<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DocumentUploadController;
use App\Http\Controllers\SemanticController;
use App\Http\Controllers\AnalysisController;
use App\Http\Controllers\IssueController;
use App\Http\Controllers\DocumentSummaryController;
use App\Http\Controllers\AuthController;

Route::prefix('v1')->group(function () {
    
    Route::post('/login', [AuthController::class, 'login']); // ->middleware(['throttle:6,1']); // rate limit básico
    Route::post('/logout', [AuthController::class, 'logout'])->middleware(['auth:sanctum']);
    Route::get('/me', [AuthController::class, 'me'])->middleware(['auth:sanctum']);
    

    Route::get('/documents', [DocumentUploadController::class, 'index'])->middleware(['auth:sanctum']);
    Route::get('/documents/{id}', [DocumentUploadController::class, 'show'])->middleware(['auth:sanctum']);
    Route::get('/documents/{id}/layout', [SemanticController::class, 'buscarJsonLayoutByDocumentId']);
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
    
    // Gestión de usuarios en grupos
    Route::post('/groups/{group_id}/users', [DocumentUploadController::class, 'addUserToGroup'])->middleware(['auth:sanctum']);
    Route::put('/groups/{group_id}/users/{user_id}/status', [DocumentUploadController::class, 'updateUserStatus'])->middleware(['auth:sanctum']);
    Route::get('/groups/{group_id}/pending-users', [DocumentUploadController::class, 'getPendingUsers'])->middleware(['auth:sanctum']);

});

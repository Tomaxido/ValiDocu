<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DocumentUploadController;
use App\Http\Controllers\SemanticController;
use App\Http\Controllers\AnalysisController;
use App\Http\Controllers\IssueController;


Route::prefix('v1')->group(function () {
    Route::get('/documents', [DocumentUploadController::class, 'index']);
    Route::get('/documents/{id}', [DocumentUploadController::class, 'show']);
    Route::get('/documents/{id}/layout', [SemanticController::class, 'buscarJsonLayoutByDocumentId']);

    Route::post('/documents', [DocumentUploadController::class, 'storeNewGroup']);
    Route::post('/documents/{group_id}', [DocumentUploadController::class, 'addToGroup']);

    Route::delete('/documents/file/{id}', [DocumentUploadController::class, 'destroyFile']);
    Route::delete('/documents/group/{id}', [DocumentUploadController::class, 'destroyGroup']);

    Route::post('/buscar-similar', [SemanticController::class, 'buscarSimilares']);
    Route::post('/semantic-data/by-filenames', [DocumentUploadController::class, 'getSemanticDataByFilenames']);

    Route::post('/documents/{id}/analyze', [AnalysisController::class, 'analyze']);
    Route::get('/documents/{id}/analysis', [AnalysisController::class, 'showLastAnalysis']);
    Route::get('/documents/{id}/analysis/{analysis}', [AnalysisController::class, 'showAnalysis']);
    Route::patch('/issues/{id}', [IssueController::class, 'update']);


});

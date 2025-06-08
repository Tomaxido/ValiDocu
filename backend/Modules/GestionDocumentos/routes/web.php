<?php

use Illuminate\Support\Facades\Route;
use Modules\GestionDocumentos\Http\Controllers\CargaDocumentosController;
use Modules\GestionDocumentos\Http\Controllers\ListarDocumentosController;
use App\Http\Controllers\DocumentUploadController;


Route::prefix('documentos')->group(function () {
    Route::post('/documents', [DocumentUploadController::class, 'store']);
    Route::get('/documents', [DocumentUploadController::class, 'index']);
});

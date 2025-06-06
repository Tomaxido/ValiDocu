<?php

use Illuminate\Support\Facades\Route;
use Modules\GestionDocumentos\Http\Controllers\CargaDocumentosController;
use Modules\GestionDocumentos\Http\Controllers\ListarDocumentosController;

Route::prefix('documentos')->group(function () {
    Route::get('/', [CargaDocumentosController::class, 'index']);
    Route::get('/listar', [ListarDocumentosController::class, 'listar']);
    Route::post('/subir', [CargaDocumentosController::class, 'store']);
});

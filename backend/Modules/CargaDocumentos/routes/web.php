<?php

use Illuminate\Support\Facades\Route;
use Modules\CargaDocumentos\Http\Controllers\CargaDocumentosController;

Route::prefix('documentos')->group(function () {
    Route::get('/', [CargaDocumentosController::class, 'index']);
    Route::post('/subir', [CargaDocumentosController::class, 'store']);
});

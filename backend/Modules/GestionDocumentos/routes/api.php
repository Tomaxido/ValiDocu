<?php

use Illuminate\Support\Facades\Route;
use Modules\GestionDocumentos\Http\Controllers\CargaDocumentosController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('gestiondocumentos', CargaDocumentosController::class)->names('gestiondocumentos');
});

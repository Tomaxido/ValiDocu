<?php

use Illuminate\Support\Facades\Route;
use Modules\CargaDocumentos\Http\Controllers\CargaDocumentosController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('cargadocumentos', CargaDocumentosController::class)->names('cargadocumentos');
});

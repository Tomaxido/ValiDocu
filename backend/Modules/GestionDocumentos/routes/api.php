<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DocumentUploadController;

Route::prefix('v1')->group(function () {
    Route::get('/documents', [DocumentUploadController::class, 'index']);
    Route::post('/documents', [DocumentUploadController::class, 'store']);
});
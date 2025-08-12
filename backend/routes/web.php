<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;
use Illuminate\Http\Request;
use App\Models\DocumentGroup;
use Symfony\Component\Mime\MimeTypes;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/documentos/vista', function () {
    $grupos = DocumentGroup::with('documents')->get();
    return view('documentos.index', compact('grupos'));
});

Route::get('/documentos/formulario', function () {
    return view('documentos.formulario');
});

Route::get('/secure-pdf/{hashed}', function ($hashed) {
    $path = storage_path('app/public/documents/' . $hashed);

    if (!file_exists($path)) {
        abort(404);
    }

    // Detectar tipo MIME real
    $mimeType = MimeTypes::getDefault()->guessMimeType($path);

    return Response::file($path, [
        'Content-Type' => $mimeType ?? 'application/octet-stream',
        'Access-Control-Allow-Origin' => '*',
    ]);
});

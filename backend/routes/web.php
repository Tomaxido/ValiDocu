<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;
use Illuminate\Http\Request;
use App\Models\DocumentGroup;
use Illuminate\Contracts\View\View;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\Mime\MimeTypes;

Route::get('/', function (): View {
    return view('welcome');
});

Route::get('/documentos/vista', function (): View {
    $grupos = DocumentGroup::with('documents')->get();
    return view('documentos.index', compact('grupos'));
});

Route::get('/documentos/formulario', function (): View {
    return view('documentos.formulario');
});

Route::get('/secure-pdf/{hashed}', function (string $hashed): BinaryFileResponse {
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

<?php

use Illuminate\Support\Facades\Route;
use App\Models\DocumentGroup;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

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

    return Response::file($path, [
        'Content-Type' => 'application/pdf',
        'Access-Control-Allow-Origin' => '*',
    ]);
});
<?php

use Illuminate\Support\Facades\Route;
use App\Models\DocumentGroup;

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
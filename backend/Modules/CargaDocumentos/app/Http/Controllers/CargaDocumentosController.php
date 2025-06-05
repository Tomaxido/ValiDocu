<?php

namespace Modules\CargaDocumentos\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CargaDocumentos\Models\Documento;
use Illuminate\Support\Facades\Storage;

class CargaDocumentosController extends Controller
{
    public function index()
    {
        return view('cargadocumentos::index');
    }

    public function store(Request $request)
    {
        $request->validate([
            'documento' => 'required|file|mimes:pdf|max:5120',
        ]);

        $file = $request->file('documento');
        $nombreOriginal = $file->getClientOriginalName();
        $path = $file->store('documentos');

        Documento::create([
            'nombre_original' => $nombreOriginal,
            'path' => $path,
            'tipo' => 'pdf',
            'estado_validacion' => 'pendiente'
        ]);

        return back()->with('success', 'Documento subido correctamente.');
    }
}

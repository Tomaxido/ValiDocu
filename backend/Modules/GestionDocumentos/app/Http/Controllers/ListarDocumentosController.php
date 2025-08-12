<?php

namespace Modules\GestionDocumentos\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\GestionDocumentos\Models\Documento;
use Illuminate\Support\Facades\Storage;

class ListarDocumentosController extends Controller
{
    public function index()
    {
        return view('gestiondocumentos::subir_archivo');
    }

    public function listar()
    {
        $documentos = Documento::all();
            return view('gestiondocumentos::listar_documentos', compact('documentos'));
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

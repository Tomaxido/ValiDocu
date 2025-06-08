<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DocumentGroup;
use App\Models\Document;

class DocumentUploadController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'group_name' => 'required|string|max:255',
            'documents.*' => 'required|file',
        ]);

        $group = DocumentGroup::create([
            'name' => $request->group_name,
            'status' => '0', // por defecto
        ]);

        foreach ($request->file('documents') as $file) {
            $path = $file->store('documents', 'public');
            $group->documents()->create([
                'filename' => $file->getClientOriginalName(),
                'filepath' => $path,
                'mime_type' => $file->getClientMimeType(),
                'status' => '0',
            ]);
        }

        return response()->json(['message' => 'Documentos subidos correctamente.']);
    }
    public function show($id)
    {
        $group = DocumentGroup::with('documents')->find($id);

        if (!$group) {
            return response()->json(['message' => 'Grupo no encontrado'], 404);
        }

        return response()->json($group);
    }
    public function index()
    {
        $groups = DocumentGroup::with('documents')->get();
        return response()->json($groups);
    }

}

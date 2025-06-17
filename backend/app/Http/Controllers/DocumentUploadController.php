<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DocumentGroup;
use App\Models\Document;

class DocumentUploadController extends Controller
{
    public function storeNewGroup(Request $request)
    {
        $request->validate([
            'group_name' => 'required|string|max:255',
            'documents.*' => 'required|file',
        ]);

        $group = DocumentGroup::create([
            'name' => $request->group_name,
            'status' => 0,
        ]);

        foreach ($request->file('documents') as $file) {

            //tranformar a png
            //mandar los png a la ia
            //recibir el json y ver que hacer, ademas de respuesta del rut

            $path = $file->store('documents', 'public');
            $group->documents()->create([
                'filename' => $file->getClientOriginalName(),
                'filepath' => $path,
                'mime_type' => $file->getClientMimeType(),
                'status' => 0,
            ]);

            // Obtener nombre base sin extensión, por ejemplo: contrato_12
            $originalBaseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

            // Convertir PDF a imágenes
            $images = $this->convertPdfToImages($path);

            foreach ($images as $imgPath) {
                // Detectar número de página desde el nombre generado
                $pageNumber = '';
                if (preg_match('/_p(\d+)\.png$/', $imgPath, $matches)) {
                    $pageNumber = $matches[1]; // ej: "1"
                }

                // Construir nuevo nombre amigable
                $newFilename = $originalBaseName . '_p' . $pageNumber . '.png';

                $group->documents()->create([
                    'filename' => $newFilename,
                    'filepath' => $imgPath,
                    'mime_type' => 'image/png',
                    'status' => 0,
                ]);
            }
        }

        return response()->json(['message' => 'Grupo creado y documentos subidos.', 'group_id' => $group->id]);
    }

    public function convertPdfToImages($relativePath)
    {
        $pdfPath = storage_path('app/public/' . $relativePath);

        // Convertir ruta de Windows a ruta WSL
        $wslPdfPath = str_replace('\\', '/', $pdfPath);
        $wslPdfPath = '/mnt/' . strtolower($wslPdfPath[0]) . substr($wslPdfPath, 2); // ej: C:\... → /mnt/c/...

        \Log::info("🛠 Ejecutando script con: {$wslPdfPath}");

        $ubuntuDistro = env('UBUNTU_DISTRO');
        $pythonBin = env('PYTHON_BIN');
        $scriptPath = env('SCRIPT_PATH');

        $command = "wsl -d {$ubuntuDistro} {$pythonBin} {$scriptPath} " . escapeshellarg($wslPdfPath);

        \Log::info("📤 Comando armado: {$command}");

        $output = shell_exec($command);

        \Log::info("📥 Resultado del script: {$output}");

        $result = json_decode($output, true);

        // Convertimos las rutas WSL devueltas por Python a rutas relativas Laravel
        $images = array_map(function ($imgPath) {
            return 'documents/' . basename($imgPath);
        }, $result['images'] ?? []);

        return $images;
    }

    public function addToGroup(Request $request, $group_id)
    {
        $request->validate([
            'documents.*' => 'required|file',
        ]);

        $group = DocumentGroup::findOrFail($group_id);

        foreach ($request->file('documents') as $file) {
            $path = $file->store('documents', 'public');
            $group->documents()->create([
                'filename' => $file->getClientOriginalName(),
                'filepath' => $path,
                'mime_type' => $file->getClientMimeType(),
                'status' => 0,
            ]);
        }

        return response()->json(['message' => 'Documentos añadidos al grupo ' . $group->name]);
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

    public function destroyFile($id)
    {
        $document = Document::find($id);

        if (!$document) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }

        // Borra el archivo físico si existe
        if (\Storage::disk('public')->exists($document->filepath)) {
            \Storage::disk('public')->delete($document->filepath);
        }

        $document->delete();

        return response()->json(['message' => 'Documento eliminado correctamente.']);
    }
    public function destroyGroup($id)
    {
        $group = DocumentGroup::with('documents')->find($id);

        if (!$group) {
            return response()->json(['message' => 'Grupo no encontrado'], 404);
        }

        foreach ($group->documents as $document) {
            if (\Storage::disk('public')->exists($document->filepath)) {
                \Storage::disk('public')->delete($document->filepath);
            }
            $document->delete();
        }

        $group->delete();

        return response()->json(['message' => 'Grupo y documentos eliminados correctamente.']);
    }

}

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DocumentGroup;
use App\Models\Document;
use Illuminate\Support\Facades\Http;
use App\Services\SiiService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;


class DocumentUploadController extends Controller
{

    protected $siiService;

    public function __construct(SiiService $siiService)
    {
        $this->siiService = $siiService;
    }

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
            $images = $this->convertPdfToImages($path,$group);

            // Guardar imagenes en carpeta manteniendo el nombre del documento
            $this->saveImages($images, $originalBaseName, $group);
        }

        return response()->json(['message' => 'Grupo creado y documentos subidos.', 'group_id' => $group->id]);
    }

    public function saveImages($images, $originalBaseName, $group)
    {
        foreach ($images as $imgPath) {
            // Detectar número de página desde el nombre generado
            $pageNumber = '';
            if (preg_match('/_p(\d+)\.png$/', $imgPath, $matches)) {
                $pageNumber = $matches[1]; // ej: "1"
            }

            // Construir nuevo nombre amigable
            $newFilename = $originalBaseName . '_p' . $pageNumber . '.png';

            $document = $group->documents()->create([
                'filename' => $newFilename,
                'filepath' => $imgPath,
                'mime_type' => 'image/png',
                'status' => 0,
            ]);
            // === Enviar a API FastAPI ===
            try {
                $absolutePath = storage_path('app/public/' . $imgPath);

                $response = Http::attach(
                    'file', fopen($absolutePath, 'r'), $newFilename
                )->post('http://localhost:5050/procesar/', [
                    'doc_id' => $document->id,
                    'group_id' => $group->id,
                ]);

                // Podís guardar respuesta si querís:
                if ($response->successful()) {
                    // actualizar estado, guardar json path, etc.

                    $data = DB::table('semantic_index')
                        ->select('id', 'json_layout')
                        ->where('document_id', $document->id)
                        ->first(); // ← obtiene un solo registro

                    $layout = json_decode($data->json_layout, true);
                    $modificado = false;

                    foreach ($layout as &$campo) {
                        if ($campo['label'] === 'RUT') {
                            $limpio = strtoupper(preg_replace('/[^0-9kK]/', '', $campo['text']));
                            $rut = substr($limpio, 0, -1);
                            $dv = substr($limpio, -1);

                            $sii = $this->checkRut($rut, $dv);
                            // Lógica de validación del RUT chileno
                            if ($sii->getStatusCode() == 400) {
                                \Log::error("❌ Error al verificar RUT");
                                $campo['label'] = 'RUT_E';
                                $campo['text'] = $rut . '-' . $dv;
                                $modificado = true;
                            } else {
                                \Log::info("RUT Correcto");
                                $campo['text'] = $rut . '-' . $dv;
                            }
                        }
                    }

                    // Si se modificó, se actualiza el json en la tabla
                    if ($modificado) {
                        \Log::info("🔄 Actualizando json_layout para documento ID: {$document->id}");
                        DB::table('semantic_index')
                            ->where('document_id', $document->id)
                            ->update([
                                'json_layout' => json_encode($layout)
                            ]);

                        $document->update([
                            'status' => 2, // Estado 2 para indicar que fue rechazado por campos errados.
                            'metadata' => $response->json(), // solo si tenís columna metadata
                        ]);
                    } else {
                        $document->update([
                            'status' => 1,
                            'metadata' => $response->json(), // solo si tenís columna metadata
                        ]);
                    }
                } else {
                    \Log::error("Procesamiento falló para $newFilename", ['error' => $response->body()]);
                }

            } catch (\Exception $e) {
                \Log::error("Error al procesar con IA", ['error' => $e->getMessage()]);
            }
        }
    }

    public function convertPdfToImages($relativePath, $group)
    {
        $pdfPath = storage_path('app/public/' . $relativePath);
        $filename = basename($relativePath);

        \Log::info("📄 Ruta PDF: $pdfPath");

        if (!file_exists($pdfPath)) {
            \Log::error("❌ PDF no encontrado: $pdfPath");
            return [];
        }

        try {
            \Log::info("📤 Enviando PDF a API: $filename");

            $response = Http::attach(
                'file',
                fopen($pdfPath, 'r'),
                $filename
            )->post('http://localhost:5050/pdf_to_images/');

            \Log::info("🔁 Respuesta API status: " . $response->status());
            \Log::debug("📦 Respuesta body: " . $response->body());

            if (!$response->successful()) {
                \Log::error("❌ Falló llamada a FastAPI", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [];
            }

            $data = $response->json();

            if (!isset($data['images']) || empty($data['images'])) {
                \Log::warning("⚠️ No se recibieron imágenes desde la API.");
            }

            $imagenesGuardadas = [];

            foreach ($data['images'] as $img) {
                $imgFilename = $img['filename'];
                $base64 = $img['content_base64'];

                \Log::info("💾 Guardando imagen: $imgFilename");

                $path = storage_path("app/public/documents/{$imgFilename}");
                $result = file_put_contents($path, base64_decode($base64));
                
                $imagenesGuardadas[] = "documents/{$imgFilename}";

            }

            return $imagenesGuardadas;

        } catch (\Exception $e) {
            \Log::error("❌ Excepción en conversión PDF", ['error' => $e->getMessage()]);
            return [];
        }
    }


    public function addToGroup(Request $request, $group_id)
    {
        $request->validate([
            'documents.*' => 'required|file',
        ]);

        $group = DocumentGroup::findOrFail($group_id);

        foreach ($request->file('documents') as $file) {
            $path = $file->store('documents', 'public');
            $originalBaseName = $file->getClientOriginalName();
            $group->documents()->create([
                'filename' => $originalBaseName,
                'filepath' => $path,
                'mime_type' => $file->getClientMimeType(),
                'status' => 0,
            ]);
            $images = $this->convertPdfToImages($path, $group);
            $this->saveImages($images, $originalBaseName, $group);
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

    public function getSemanticDataByFilenames(Request $request)
    {
        // 1. Log de lo que llega
        $ids = $request->input('ids');
        Log::info('📥 Ids recibidos en API:', $ids);

        if (!is_array($ids)) {
            Log::warning('⚠️ El parámetro "ids" no es un array:', ['ids' => $ids]);
            return response()->json(['error' => 'Se esperaba un array de nombres de archivo.'], 400);
        }

        // 2. Log del query generado
        $data = DB::table('semantic_index')
            ->join('documents', 'semantic_index.document_id', '=', 'documents.id')
            ->whereIn('documents.id', $ids)
            ->select('documents.filename', 'semantic_index.json_layout')
            ->get();

        Log::info('📤 Resultados de la consulta:', $data->toArray());

        return response()->json($data->map(function ($item) {
            return (array) $item;
        }));
    }

    public function checkRut($rut, $dv)
    {
        $max_intentos = 10;
        $intentos = 0;
        $ultimoError = null;

        while ($intentos < $max_intentos) {
            try {
                $datos = $this->siiService->checkDte($rut, $dv);
                return response()->json($datos, 200);
            } catch (\Exception $e) {
                $intentos++;
                $ultimoError = $e; // Guarda el último error
                \Log::error("Intento $intentos fallido: " . $e->getMessage());
            }
        }

        // Fuera del while: si llegamos aquí, todos los intentos fallaron
        return response()->json([
            'code' => 400,
            'intentos' => $intentos,
            'message' => $ultimoError ? $ultimoError->getMessage() : 'Error desconocido.'
        ], 400);
    }
}

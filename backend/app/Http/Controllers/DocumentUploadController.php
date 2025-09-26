<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DocumentGroup;
use App\Models\Document;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\SiiService;
use Illuminate\Support\Str;


class DocumentUploadController extends Controller
{
    public function __construct(SiiService $siiService)
    {
        parent::__construct($siiService);
    }


    function _addDocumentsToGroup(Request $request, DocumentGroup &$group) {
        $obligatorios = DB::table('document_types')
            ->get(['id','nombre_doc', 'analizar'])
            ->sortByDesc(function($o) { return mb_strlen((string)$o->nombre_doc, 'UTF-8'); })
            ->values();
        foreach ($request->file('documents') as $file) {
            // ...existing code...
            $path = $file->store('documents', 'public');
            $originalFilename = $file->getClientOriginalName();
            $document = $group->documents()->create([
                'filename' => $originalFilename,
                'filepath' => $path,
                'mime_type' => $file->getClientMimeType(),
                'status' => 0,
            ]);
            // Obtener ID del documento maestro
            $document_master_id = $document->id;
            
            // Primero determinar el tipo y si debe ser analizado
            $filename = (string)$document->filename;
            $normFile = $this->normalizeName($filename);
            Log::info("Analizando documento: {$filename}, normalizado: {$normFile}");
            $found = false;
            $analizar = 0;
            $tipo = 0;
            foreach ($obligatorios as $obl) {
                $nombreDoc = (string)$obl->nombre_doc;
                $analizar  = (int)$obl->analizar;
                $idObligatorio = $obl->id ?? null;
                Log::info("Nombre Documento Obligatorio: {$nombreDoc}, analizar: {$analizar}");
                if ($this->matchFilenameToNombreDoc($normFile, $this->normalizeName($nombreDoc))) {
                    $found = true;
                    $tipo = $idObligatorio;
                    break;
                }
            }
            if (!$found) {
                $tipo = 0;
                $analizar = 0;
            }
            $document->tipo = $tipo;
            $document->save();
            
            // Ahora convertir y procesar imágenes con el valor de analizar conocido
            $originalBaseName = pathinfo($originalFilename, PATHINFO_FILENAME);
            $images = $this->convertPdfToImages($path,$group);
            $rechazado = $this->saveImages($images, $originalBaseName, $group, $document_master_id, $analizar);
            if ($rechazado) {
                $document->status = 2;
                $document->save();
            } else {
                $document->status = 1;
                $document->save();
            }
            if($analizar == 1){
                app(\App\Http\Controllers\AnalysisController::class)->createSuggestions($document_master_id);
            }

            // === CREAR semantic_doc_index SI NO EXISTE ===
            $exists = DB::table('semantic_doc_index')->where('document_id', $document_master_id)->exists();
            if (!$exists) {
                DB::table('semantic_doc_index')->insert([
                    'document_id' => $document_master_id,
                    'document_group_id' => $group->id,
                    'json_global' => null,
                    'resumen' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
    private function normalizeName(string $name): string
    {
        $ascii = Str::ascii($name);
        $upper = mb_strtoupper($ascii, 'UTF-8');
        // reemplazar múltiples espacios y signos por un solo espacio
        $upper = preg_replace('/[^A-Z0-9]+/u', ' ', $upper);
        $upper = trim(preg_replace('/\s+/', ' ', $upper) ?? '');
        return $upper;
    }

    private function matchFilenameToNombreDoc(string $normFile, string $normNombre): bool
    {
        if ($normNombre === '') return false;
        $parts = array_filter(preg_split('/\s+/', $normNombre) ?: [], function($w) {
            return $w !== 'DE';
        });
        // construir regex: WORD1 (?:\s+(?:DE\s+)?WORD2) (?:\s+(?:DE\s+)?WORD3) ...
        if (empty($parts)) return false;

        $regex = '';
        $first = true;
        foreach ($parts as $w) {
            $w = preg_quote($w, '/');
            if ($first) {
                $regex .= $w;
                $first = false;
            } else {
                $regex .= '(?:\s+(?:DE\s+)?' . $w . ')';
            }
        }
        // buscar en cualquier parte, case-insensitive (ya está upper), U para unicode
        return (bool) preg_match('/' . $regex . '/u', $normFile);
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

        // Añadir el usuario autenticado como propietario del grupo
        $user = $request->user();
        $group->users()->attach($user->id, [
            'active' => 1, // puede ver (predeterminado para quien lo crea)
            'managed_by' => $user->id // quien lo aprobó (él mismo)
        ]);

        $this->_addDocumentsToGroup($request, $group);
        
        return response()->json([
            'message' => 'Grupo creado y documentos subidos.',
            'group_id' => $group->id,
            'group' => $group->load('users')
        ]);
    }

    public function saveImages($images, $originalBaseName, $group, $document_master_id, $analizar)
    {
        $modificado_global = false;
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
            
            // === Enviar a API FastAPI solo si analizar = 1 ===
            if ($analizar == 1) {
                try {
                    $absolutePath = storage_path('app/public/' . $imgPath);

                    $response = Http::attach(
                        'file', fopen($absolutePath, 'r'), $newFilename
                    )->post('http://localhost:5050/procesar/', [
                        'master_id' => $document_master_id,
                        'doc_id' => $document->id,
                        'group_id' => $group->id,
                        'page' => $pageNumber
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
                    $labelsRut = ['RUT_DEUDOR','RUT_CORREDOR','EMPRESA_DEUDOR_RUT','EMPRESA_CORREDOR_RUT'];

                    foreach ($layout as &$campo) {
                        if (!isset($campo['label'], $campo['text'])) continue;

                        if (in_array($campo['label'], $labelsRut, true)) {
                            $limpio = strtoupper(preg_replace('/[^0-9K]/', '', $campo['text']));
                            if (strlen($limpio) < 2) continue;

                            $rut = substr($limpio, 0, -1);
                            $dv  = substr($limpio, -1);

                            $sii = $this->checkRut($rut, $dv); // devuelve Response
                            if ($sii->getStatusCode() === 400) {
                                // marcar error manteniendo el prefijo del label y agregando _E
                                $campo['label'] = $campo['label'] . '_E';
                                $campo['text']  = $rut . '-' . $dv;
                                $modificado = true;
                            } else {
                                $campo['text']  = $rut . '-' . $dv;
                            }
                        }
                    }
                    unset($campo);

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
                        $modificado_global = true;
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
            } else {
                // Si no debe ser analizado, solo marcar con status 1 (procesado sin análisis)
                $document->update([
                    'status' => 1
                ]);
            }
        }
        return $modificado_global;
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
        
        // Verificar que el usuario tenga acceso al grupo
        $user = $request->user();
        if (!$group->users()->where('user_id', $user->id)->wherePivot('active', 1)->exists()) {
            return response()->json(['message' => 'No tienes permisos para añadir documentos a este grupo'], 403);
        }

        $this->_addDocumentsToGroup($request, $group);

        return response()->json([
            'message' => 'Documentos añadidos al grupo ' . $group->name
        ]);
    }
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $group = $user->activeDocumentGroups()
                     ->with(['documents', 'users'])
                     ->find($id);

        if (!$group) {
            return response()->json(['message' => 'Grupo no encontrado o sin permisos'], 404);
        }

        return response()->json($group);
    }
    public function index(Request $request)
    {
        $user = $request->user();
        $groups = $user->activeDocumentGroups()
                      ->with(['documents', 'users'])
                      ->get();
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

        // Nuevo endpoint para obtener el resumen de un documento
    public function getDocumentSummary($document_id){
        $data = DB::table('semantic_doc_index')
            ->where('document_id', $document_id)
            ->select('resumen')
            ->first();
        if (!$data) {
            return response()->json(['resumen' => null], 404);
        }
        return response()->json(['resumen' => $data->resumen]);
    }

    /**
     * Añadir usuario a un grupo existente
     */
    public function addUserToGroup(Request $request, $group_id)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'active' => 'sometimes|in:0,1,2' // 0=pendiente, 1=aprobado, 2=rechazado
        ]);

        $user = $request->user();
        $group = DocumentGroup::findOrFail($group_id);

        // Verificar que el usuario actual sea propietario del grupo
        $isOwner = $group->users()
                         ->where('user_id', $user->id)
                         ->wherePivot('active', 1)
                         ->wherePivot('managed_by', $user->id)
                         ->exists();

        if (!$isOwner) {
            return response()->json(['message' => 'Solo el propietario puede gestionar usuarios del grupo'], 403);
        }

        $activeStatus = $request->input('active', 0); // Por defecto pendiente

        // Añadir el usuario al grupo
        $group->users()->syncWithoutDetaching([
            $request->user_id => [
                'active' => $activeStatus,
                'managed_by' => $user->id // quien aprueba es el usuario actual
            ]
        ]);

        return response()->json([
            'message' => 'Usuario añadido al grupo correctamente',
            'status' => $activeStatus == 0 ? 'pendiente' : ($activeStatus == 1 ? 'aprobado' : 'rechazado'),
            'group' => $group->load('users')
        ]);
    }

    /**
     * Aprobar/rechazar usuario en un grupo
     */
    public function updateUserStatus(Request $request, $group_id, $user_id)
    {
        $request->validate([
            'active' => 'required|in:1,2' // 1=aprobado, 2=rechazado
        ]);

        $currentUser = $request->user();
        $group = DocumentGroup::findOrFail($group_id);

        // Verificar que el usuario actual sea propietario del grupo
        $isOwner = $group->users()
                         ->where('user_id', $currentUser->id)
                         ->wherePivot('active', 1)
                         ->wherePivot('managed_by', $currentUser->id)
                         ->exists();

        if (!$isOwner) {
            return response()->json(['message' => 'Solo el propietario puede aprobar/rechazar usuarios'], 403);
        }

        // Actualizar el status del usuario en el grupo
        $group->users()->updateExistingPivot($user_id, [
            'active' => $request->active,
            'managed_by' => $currentUser->id
        ]);

        $status = $request->active == 1 ? 'aprobado' : 'rechazado';

        return response()->json([
            'message' => "Usuario {$status} correctamente",
            'status' => $status
        ]);
    }

    /**
     * Obtener usuarios pendientes de aprobación en un grupo
     */
    public function getPendingUsers(Request $request, $group_id)
    {
        $currentUser = $request->user();
        $group = DocumentGroup::findOrFail($group_id);

        // Verificar que el usuario actual sea propietario del grupo
        $isOwner = $group->users()
                         ->where('user_id', $currentUser->id)
                         ->wherePivot('active', 1)
                         ->wherePivot('managed_by', $currentUser->id)
                         ->exists();

        if (!$isOwner) {
            return response()->json(['message' => 'Solo el propietario puede ver usuarios pendientes'], 403);
        }

        $pendingUsers = $group->users()
                            ->wherePivot('active', 0)
                            ->get();

        return response()->json([
            'pending_users' => $pendingUsers,
            'count' => $pendingUsers->count()
        ]);
    }
}

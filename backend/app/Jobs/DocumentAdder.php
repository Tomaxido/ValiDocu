<?php

namespace App\Jobs;

use App\Events\DocumentsProcessed;
use App\Models\DocumentGroup;
use App\Services\GroupValidationService;
use App\Services\SiiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DocumentAdder implements ShouldQueue
{
    use Queueable;

    protected SiiService $siiService;
    protected GroupValidationService $groupValidationService;
    protected array $serializedFiles;
    protected DocumentGroup $group;

    public function __construct(
        SiiService $siiService,
        GroupValidationService $groupValidationService,
        array $documents,
        DocumentGroup $group,
    )
    {
        $this->siiService = $siiService;
        $this->groupValidationService = $groupValidationService;
        $this->serializedFiles = $documents;
        $this->group = $group;
    }

    public function handle(): void
    {
        $this->addDocumentsToGroup();
    }

    private function addDocumentsToGroup(): void {
        try
        {
            // Obtener tipos de documentos configurados para este grupo específico usando group_field_specs
            $configuredTypes = $this->groupValidationService->getGroupRequiredDocumentTypes($this->group->id);

            // Si no hay configuración específica, usar configuración global como fallback
            if (empty($configuredTypes)) {
                $obligatorios = DB::table('document_types')
                    ->get(['id','nombre_doc', 'analizar'])
                    ->map(function($o) {
                        $o->is_required_in_group = true; // Por defecto requerido
                        return $o;
                    })
                    ->sortByDesc(function($o) { return mb_strlen((string)$o->nombre_doc, 'UTF-8'); })
                    ->values();
            } else {
                // Usar la configuración específica del grupo
                $obligatorios = collect($configuredTypes)
                    ->map(function($type) {
                        // Obtener información adicional del tipo de documento
                        $docType = DB::table('document_types')->where('id', $type->id)->first();
                        return (object)[
                            'id' => $type->id,
                            'nombre_doc' => $type->nombre_doc,
                            'analizar' => $docType->analizar ?? 0,
                            'is_required_in_group' => true
                        ];
                    })
                    ->sortByDesc(function($o) { return mb_strlen((string)$o->nombre_doc, 'UTF-8'); })
                    ->values();
            }

            // Inicializar configuración por defecto si no existe
            if (!$this->groupValidationService->hasGroupConfiguration($this->group->id)) {
                Log::info("Inicializando configuración por defecto para el grupo {$this->group->id}");
                $this->groupValidationService->initializeGroupConfiguration($this->group->id);
            }

            $documents = [];
            $notificationIds = [];

            foreach ($this->serializedFiles as $file) {
                // ...existing code...
                $document = $this->group->documents()->create($file);
                $documents[] = $document;

                // Insertar aviso de que se está analizando el documento
                // TODO: el nombre 'notification_history' podría ser algo engañoso en este caso, porque este preciso registro no es una notificación.
                $notificationIds[] = DB::table('notification_history')->insertGetId([
                    'user_id' => $this->group->created_by,
                    'type' => 'doc_analysis',
                    'message' => json_encode([
                        'group' => $this->group,
                        'document' => $document,
                        'status' => 'started',
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                    'read' => true,  // uno ya sabe cuando envía un documento a analizar
                ]);
            }

            foreach ($documents as $i => $document) {
                // Obtener ID del documento maestro
                $document_master_id = $document->id;
                $this->serializedFiles[$i]['id'] = $document_master_id;
                $notificationId = $notificationIds[$i];
                $file = $this->serializedFiles[$i];

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
                $originalBaseName = pathinfo($file['filename'], PATHINFO_FILENAME);
                $images = $this->convertPdfToImages($file['filepath']);
                // TODO: este $rechazado no parece ser el verdadero indicador de si hay un error al procesar
                $rechazado = $this->saveImages($images, $originalBaseName, $document_master_id, $analizar);
                if ($rechazado) {
                    $this->serializedFiles[$i]['status'] = 2;
                    $document->status = 2;
                    $document->save();
                } else {
                    $this->serializedFiles[$i]['status'] = 1;
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
                        'document_group_id' => $this->group->id,
                        'json_global' => null,
                        'resumen' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                event(new DocumentsProcessed($this->group, $document));

                // Actualizar notificación respectiva
                DB::table('notification_history')->where('id', $notificationId)->update([
                    'message' => json_encode([
                        'group' => $this->group,
                        'document' => $document,
                        'status' => $rechazado ? 'error' : 'completed',
                    ]),
                    'read' => false,
                    'updated_at' => now(),
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Error en DocAdder: " . $e->getMessage());
            throw $e;
        }

        // Al final, validar todos los documentos contra la configuración del grupo
        $this->validateGroupDocuments();
    }

    /**
     * Validar documentos del grupo contra su configuración
     */
    private function validateGroupDocuments(): void
    {
        try {
            $documents = $this->group->documents()->get(); // Obtener todos los documentos del grupo

            foreach ($documents as $document) {
                $issues = $this->groupValidationService->validateDocumentAgainstGroup(
                    $this->group->id,
                    $document->document_type ?? 'unknown',
                    $document->labels ?? []
                );

                if (!empty($issues)) {
                    // Marcar documento con issues pero no rechazado completamente
                    $document->update(['status' => 3]); // Nuevo status: "Con observaciones"

                    Log::info("Documento {$document->filename} tiene observaciones de validación", [
                        'document_id' => $document->id,
                        'group_id' => $this->group->id,
                        'issues_count' => count($issues),
                        'issues' => $issues
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::error("Error validando documentos del grupo {$this->group->id}: " . $e->getMessage());
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

    private function saveImages(
        array $images,
        string $originalBaseName,
        int $document_master_id,
        bool $analizar,
    ): bool
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

            $document = $this->group->documents()->create([
                'filename' => $newFilename,
                'filepath' => $imgPath,
                'mime_type' => 'image/png',
                'status' => 0,
            ]);

            // === Enviar a API FastAPI solo si analizar = 1 ===
            if ($analizar == 0) {
                // Si no debe ser analizado, solo marcar con status 1 (procesado sin análisis)
                $document->update(['status' => 1]);
                continue;
            }
            try {
                $absolutePath = storage_path('app/public/' . $imgPath);

                $response = Http::attach(
                    'file', fopen($absolutePath, 'r'), $newFilename
                )->post('http://localhost:5050/procesar/', [
                    'master_id' => $document_master_id,
                    'doc_id' => $document->id,
                    'group_id' => $this->group->id,
                    'page' => $pageNumber
                ]);
                if (!$response->successful()) {
                    Log::error("Procesamiento falló para $newFilename", ['error' => $response->body()]);
                    continue;
                }

                // Podís guardar respuesta si querís:
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
                    Log::info("🔄 Actualizando json_layout para documento ID: {$document->id}");
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

            } catch (\Exception $e) {
                Log::error("Error al procesar con IA", ['error' => $e->getMessage()]);
            }
        }
        return $modificado_global;
    }

    private function convertPdfToImages(string $relativePath): array
    {
        $pdfPath = storage_path('app/public/' . $relativePath);
        $filename = basename($relativePath);

        Log::info("📄 Ruta PDF: $pdfPath");

        if (!file_exists($pdfPath)) {
            Log::error("❌ PDF no encontrado: $pdfPath");
            return [];
        }

        try {
            Log::info("📤 Enviando PDF a API: $filename");

            $response = Http::attach(
                'file',
                fopen($pdfPath, 'r'),
                $filename
            )->post('http://localhost:5050/pdf_to_images/');

            Log::info("🔁 Respuesta API status: " . $response->status());
            Log::debug("📦 Respuesta body: " . $response->body());

            if (!$response->successful()) {
                Log::error("❌ Falló llamada a FastAPI", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [];
            }

            $data = $response->json();

            if (!isset($data['images']) || empty($data['images'])) {
                Log::warning("⚠️ No se recibieron imágenes desde la API.");
            }

            $imagenesGuardadas = [];

            foreach ($data['images'] as $img) {
                $imgFilename = $img['filename'];
                $base64 = $img['content_base64'];

                Log::info("💾 Guardando imagen: $imgFilename");

                $path = storage_path("app/public/documents/{$imgFilename}");
                $result = file_put_contents($path, base64_decode($base64));

                $imagenesGuardadas[] = "documents/{$imgFilename}";

            }

            return $imagenesGuardadas;

        } catch (\Exception $e) {
            Log::error("❌ Excepción en conversión PDF", ['error' => $e->getMessage()]);
            return [];
        }
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

    public function checkRut(?string $rut, ?string $dv): JsonResponse
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
                Log::error("Intento $intentos fallido: " . $e->getMessage());
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

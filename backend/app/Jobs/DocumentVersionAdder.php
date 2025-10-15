<?php

namespace App\Jobs;

use App\Events\DocumentVersionUploaded;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Services\SiiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DocumentVersionAdder implements ShouldQueue
{
    use Queueable;

    protected SiiService $siiService;
    protected array $fileData;
    protected Document $document;
    protected string $userId;
    protected string $comment;
    protected bool $success = false;

    public function __construct(
        SiiService $siiService,
        array $fileData,
        Document $document,
        string $userId,
        string $comment
    )
    {
        $this->siiService = $siiService;
        $this->fileData = $fileData;
        $this->document = $document;
        $this->userId = $userId;
        $this->comment = $comment;
    }

    public function handle(): void
    {
        try {
            $this->addNewVersion();
            $this->success = true;
        } catch (\Exception $e) {
            Log::error("Error al agregar nueva versión: " . $e->getMessage());
            $this->success = false;
            throw $e;
        } finally {
            // Emitir evento con el resultado
            event(new DocumentVersionUploaded($this->document, $this->success));
        }
    }

    private function addNewVersion(): void
    {
        DB::beginTransaction();
        
        try {
            // 1. Marcar la versión actual como no vigente (is_current = false)
            DocumentVersion::where('document_id', $this->document->id)
                ->where('is_current', true)
                ->update(['is_current' => false]);

            // 2. Obtener el número de la siguiente versión
            $lastVersion = DocumentVersion::where('document_id', $this->document->id)
                ->max('version_number');
            $nextVersionNumber = ($lastVersion ?? 0) + 1;

            // 3. Determinar si el documento debe ser analizado
            $analizar = 0;
            if ($this->document->document_type_id) {
                $documentType = DB::table('document_types')
                    ->where('id', $this->document->document_type_id)
                    ->first();
                $analizar = $documentType->analizar ?? 0;
            }

            Log::info("Creando nueva versión {$nextVersionNumber} para documento {$this->document->id}", [
                'document_type_id' => $this->document->document_type_id,
                'analizar' => $analizar,
                'user_id' => $this->userId,
            ]);

            // 4. Crear la nueva versión
            $version = DocumentVersion::create([
                'document_id' => $this->document->id,
                'version_number' => $nextVersionNumber,
                'filename' => $this->fileData['filename'],
                'filepath' => $this->fileData['filepath'],
                'mime_type' => $this->fileData['mime_type'],
                'file_size' => $this->fileData['file_size'],
                'page_count' => 1, // Se actualizará después
                'due_date' => 0, // Vigente por defecto
                'normative_gap' => 0, // Sin gap por defecto
                'checksum_sha256' => null,
                'uploaded_by' => $this->userId,
                'is_current' => true,
                'comment' => $this->comment,
            ]);

            Log::info("Versión creada con ID: {$version->id}");

            // 5. Convertir PDF a imágenes y procesar
            $originalBaseName = pathinfo($this->fileData['filename'], PATHINFO_FILENAME);
            $images = $this->convertPdfToImages($this->fileData['filepath']);
            
            if (empty($images)) {
                throw new \Exception("No se pudieron generar imágenes del PDF");
            }

            $hasErrors = $this->saveImages(
                $images,
                $originalBaseName,
                $this->document->id,
                $version->id,
                $analizar
            );

            // 6. Actualizar estado del documento
            if ($hasErrors) {
                $this->document->status = 2; // Error
                Log::warning("Nueva versión procesada con errores");
            } else {
                $this->document->status = 1; // Procesado correctamente
                Log::info("Nueva versión procesada exitosamente");
            }
            $this->document->save();

            // 7. Crear/actualizar análisis si es necesario
            if ($analizar == 1) {
                Log::info("Creando sugerencias para documento {$this->document->id}");
                app(\App\Http\Controllers\AnalysisController::class)->createSuggestions($this->document->id);
            }

            // 8. Crear entrada en semantic_doc_index
            $exists = DB::table('semantic_doc_index')
                ->where('document_version_id', $version->id)
                ->exists();
                
            if (!$exists) {
                DB::table('semantic_doc_index')->insert([
                    'document_version_id' => $version->id,
                    'document_group_id' => $this->document->document_group_id,
                    'json_layout' => null,
                    'json_global' => null,
                    'resumen' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 9. Crear log de auditoría
            DB::table('document_audit_logs')->insert([
                'document_id' => $this->document->id,
                'document_version_id' => $version->id,
                'user_id' => $this->userId,
                'action' => 'reuploaded',
                'comment' => $this->comment,
                'metadata' => json_encode([
                    'version_number' => $nextVersionNumber,
                    'filename' => $this->fileData['filename'],
                    'file_size' => $this->fileData['file_size'],
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();
            Log::info("Nueva versión agregada exitosamente");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error en addNewVersion: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function saveImages(
        array $images,
        string $originalBaseName,
        int $document_master_id,
        int $version_id,
        bool $analizar
    ): bool {
        $modificado_global = false;
        $pageCount = 0;

        foreach ($images as $imgPath) {
            // Detectar número de página
            $pageNumber = '';
            if (preg_match('/_p(\d+)\.png$/', $imgPath, $matches)) {
                $pageNumber = $matches[1];
                $pageCount = max($pageCount, (int)$pageNumber);
            }

            // Crear document_page
            $page = DB::table('document_pages')->insertGetId([
                'document_version_id' => $version_id,
                'page_number' => (int)$pageNumber,
                'image_path' => $imgPath,
                'json_layout' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info("Página {$pageNumber} creada con ID: {$page}");

            // Si no debe ser analizado, continuar
            if ($analizar == 0) {
                continue;
            }

            // Enviar a API FastAPI para análisis
            try {
                $absolutePath = storage_path('app/public/' . $imgPath);
                $newFilename = $originalBaseName . '_p' . $pageNumber . '.png';

                Log::info("Enviando página {$pageNumber} a FastAPI para análisis");

                $response = Http::attach(
                    'file', fopen($absolutePath, 'r'), $newFilename
                )->post('http://localhost:5050/procesar/', [
                    'master_id' => $document_master_id,
                    'version_id' => $version_id,
                    'page_id' => $page,
                    'group_id' => $this->document->document_group_id,
                    'page' => $pageNumber
                ]);

                if (!$response->successful()) {
                    Log::error("Procesamiento FastAPI falló para {$newFilename}", [
                        'status' => $response->status(),
                        'error' => $response->body()
                    ]);
                    continue;
                }

                Log::info("Página {$pageNumber} procesada exitosamente por FastAPI");

                // Validar RUTs si es necesario
                $data = DB::table('semantic_index')
                    ->select('id', 'json_layout')
                    ->where('document_page_id', $page)
                    ->first();

                if (!$data) {
                    Log::warning("No se encontró semantic_index para página {$page}");
                    continue;
                }

                $layout = json_decode($data->json_layout, true);
                $modificado = false;
                $labelsRut = ['RUT_DEUDOR', 'RUT_CORREDOR', 'EMPRESA_DEUDOR_RUT', 'EMPRESA_CORREDOR_RUT'];

                foreach ($layout as &$campo) {
                    if (!isset($campo['label'], $campo['text'])) continue;

                    if (in_array($campo['label'], $labelsRut, true)) {
                        $limpio = strtoupper(preg_replace('/[^0-9K]/', '', $campo['text']));
                        if (strlen($limpio) < 2) continue;

                        $rut = substr($limpio, 0, -1);
                        $dv = substr($limpio, -1);

                        $sii = $this->checkRut($rut, $dv);
                        if ($sii->getStatusCode() === 400) {
                            $campo['label'] = $campo['label'] . '_E';
                            $campo['text'] = $rut . '-' . $dv;
                            $modificado = true;
                        } else {
                            $campo['text'] = $rut . '-' . $dv;
                        }
                    }
                }
                unset($campo);

                if ($modificado) {
                    DB::table('semantic_index')
                        ->where('document_page_id', $page)
                        ->update(['json_layout' => json_encode($layout)]);

                    DB::table('document_pages')
                        ->where('id', $page)
                        ->update(['json_layout' => json_encode($layout)]);

                    $modificado_global = true;
                }

            } catch (\Exception $e) {
                Log::error("Error procesando página {$pageNumber} con IA", [
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Actualizar page_count
        DB::table('document_versions')
            ->where('id', $version_id)
            ->update(['page_count' => $pageCount]);

        Log::info("Procesadas {$pageCount} páginas para versión {$version_id}");

        return $modificado_global;
    }

    private function convertPdfToImages(string $relativePath): array
    {
        $pdfPath = storage_path('app/public/' . $relativePath);
        $filename = basename($relativePath);

        Log::info("Convirtiendo PDF a imágenes: {$pdfPath}");

        if (!file_exists($pdfPath)) {
            Log::error("PDF no encontrado: {$pdfPath}");
            return [];
        }

        try {
            $response = Http::attach(
                'file',
                fopen($pdfPath, 'r'),
                $filename
            )->post('http://localhost:5050/pdf_to_images/');

            if (!$response->successful()) {
                Log::error("Falló conversión PDF a imágenes", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [];
            }

            $data = $response->json();

            if (!isset($data['images']) || empty($data['images'])) {
                Log::warning("No se recibieron imágenes desde la API");
                return [];
            }

            $imagenesGuardadas = [];

            foreach ($data['images'] as $img) {
                $imgFilename = $img['filename'];
                $base64 = $img['content_base64'];

                $path = storage_path("app/public/documents/{$imgFilename}");
                file_put_contents($path, base64_decode($base64));

                $imagenesGuardadas[] = "documents/{$imgFilename}";
                Log::info("Imagen guardada: {$imgFilename}");
            }

            return $imagenesGuardadas;

        } catch (\Exception $e) {
            Log::error("Excepción en conversión PDF", ['error' => $e->getMessage()]);
            return [];
        }
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
                $ultimoError = $e;
                Log::error("Intento {$intentos} fallido validando RUT: " . $e->getMessage());
            }
        }

        return response()->json([
            'code' => 400,
            'intentos' => $intentos,
            'message' => $ultimoError ? $ultimoError->getMessage() : 'Error desconocido.'
        ], 400);
    }
}

<?php

namespace App\Http\Controllers;

use App\Jobs\DocumentAdder;
use Illuminate\Http\Request;
use App\Models\DocumentGroup;
use App\Models\Document;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Services\SiiService;
use App\Services\GroupValidationService;
use Illuminate\Http\JsonResponse;
use App\Events\DocumentsProcessed;
use Illuminate\Support\Str;
use App\Traits\CreatesDocumentAuditLogs;
use App\Jobs\DocumentVersionAdder;


class DocumentUploadController extends Controller
{
    use CreatesDocumentAuditLogs;

    protected GroupValidationService $groupValidationService;

    public function __construct(SiiService $siiService, GroupValidationService $groupValidationService)
    {
        parent::__construct($siiService);
        $this->groupValidationService = $groupValidationService;
    }

    public function storeNewGroup(Request $request): JsonResponse
    {
        $request->validate([
            'group_name' => 'required|string|max:255',
            'documents.*' => 'required|file',
            'is_private' => 'nullable|boolean'
        ]);

        $user = $request->user();

        $group = DocumentGroup::create([
            'name' => $request->group_name,
            'status' => 0,
            'is_private' => $request->boolean('is_private', false),
            'created_by' => $user->id,
        ]);

        // Añadir el usuario autenticado como propietario del grupo
        $group->users()->attach($user->id, [
            'active' => 1, // puede ver (predeterminado para quien lo crea)
            'managed_by' => $user->id, // quien lo aprobó (él mismo)
            'can_edit' => 1 // el creador siempre puede editar
        ]);

        $this->makeJob($request, $group, $user->id);

        // Inicializar configuración por defecto si no existe
        if (!$this->groupValidationService->hasGroupConfiguration($group->id)) {
            $this->groupValidationService->initializeGroupConfiguration($group->id);
        }

        return response()->json([
            'message' => 'Grupo creado y documentos subidos.',
            'group_id' => $group->id,
            'group' => $group->load('users')
        ]);
    }

    public function addToGroup(Request $request, int $group_id): JsonResponse
    {
        $request->validate([
            'documents.*' => 'required|file',
        ]);

        $group = DocumentGroup::findOrFail($group_id);

        // Verificar que el usuario tenga acceso al grupo
        $user = $request->user();

        // Verificar que el usuario tenga acceso al grupo y permisos de edición
        if (!$group->userHasAccess($user->id)) {
            return response()->json(['message' => 'No tienes acceso a este grupo'], 403);
        }

        if (!$group->userCanEdit($user->id)) {
            return response()->json(['message' => 'No tienes permisos de edición en este grupo'], 403);
        }

        $this->makeJob($request, $group, $user->id);

        return response()->json([
            'message' => 'Documentos añadidos al grupo ' . $group->name
        ]);
    }

    private function makeJob(Request $request, DocumentGroup &$group, string $userId): void
    {
        $serializedFiles = [];
        $documents = [];
        $notificationIds = [];
        foreach ($request->file('documents') as $file) {
            $path = $file->store('documents', 'public');
            $serializedFile = [
                'filename' => $file->getClientOriginalName(),
                'filepath' => $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getClientMimeType(),
                'status' => 0,
            ];
            $serializedFiles[] = $serializedFile;

            $document = $group->documents()->create($serializedFile);
            $documents[] = $document;

            // Crear la primera versión del documento
            $document->versions()->create([
                'version_number' => 1,
                'filename' => $serializedFile['filename'],
                'filepath' => $serializedFile['filepath'],
                'mime_type' => $serializedFile['mime_type'],
                'file_size' => $serializedFile['file_size'], // Se puede calcular después si es necesario
                'page_count' => 1, // Se actualizará después
                'due_date' => 0, // Vigente por defecto
                'normative_gap' => 0, // Sin gap por defecto
                'checksum_sha256' => null,
                'uploaded_by' => $userId,
                'is_current' => true,
            ]);

            // Insertar aviso de que se está analizando el documento
            // TODO: el nombre 'notification_history' podría ser algo engañoso en este caso, porque este preciso registro no es una notificación.
            $notificationIds[] = DB::table('notification_history')->insertGetId([
                'user_id' => $userId,
                'type' => 'doc_analysis',
                'message' => json_encode([
                    'group' => $group,
                    'document' => $document,
                    'status' => 'started',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
                'is_read' => true,  // uno ya sabe cuando envía un documento a analizar
            ]);
        }
        DocumentAdder::dispatch(
            $this->siiService, $this->groupValidationService, $group, $documents, $serializedFiles, $notificationIds
        )->onQueue('docAnalysis');
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $group = DocumentGroup::with([
            'documents.currentVersion.pages',  // Cargar la versión actual y sus páginas
            'documents.documentType',           // Cargar el tipo de documento
            'users',
            'creator'
        ])->findOrFail($id);

        // Verificar que el usuario tiene acceso al grupo
        if (!$group->userHasAccess($user->id)) {
            return response()->json(['message' => 'No tienes acceso a este grupo'], 403);
        }

        // Agregar información adicional sobre permisos del usuario
        $group->user_can_edit = $group->userCanEdit($user->id);
        $group->is_owner = $group->created_by === $user->id;

        // Asegurar que cada documento tiene los atributos de su versión actual
        $group->documents->each(function($doc) {
            // Los accessors del modelo Document ya manejan esto
            // pero aseguramos que la versión actual esté cargada
            $doc->makeVisible(['filename', 'filepath', 'mime_type', 'due_date', 'normative_gap']);
        });

        return response()->json($group);
    }
    public function index(Request $request)
    {
        $user = $request->user();
        $groups = $user->accessibleDocumentGroups()->get();
        return response()->json($groups);
    }

    public function destroyFile(int $id): JsonResponse
    {
        $document = Document::find($id);

        if (!$document) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }

        // Obtener la versión actual antes del soft delete
        $currentVersion = $document->currentVersion->first();

        // Soft delete: marcar todas las versiones del documento como no actuales
        DB::table('document_versions')
            ->where('document_id', $document->id)
            ->update(['is_current' => false]);

        // Registrar log de auditoría
        $this->logDocumentDeleted(
            $document->id,
            $currentVersion?->id,
            'Documento eliminado por el usuario'
        );

        Log::info('Documento marcado como eliminado (soft delete)', [
            'document_id' => $document->id,
            'filename' => $currentVersion?->filename ?? 'documento_eliminado'
        ]);

        return response()->json(['message' => 'Documento eliminado correctamente.']);
    }

    public function destroyGroup(int $id): JsonResponse
    {
        $group = DocumentGroup::with('documents')->find($id);

        if (!$group) {
            return response()->json(['message' => 'Grupo no encontrado'], 404);
        }

        foreach ($group->documents as $document) {
            if (Storage::disk('public')->exists($document->filepath)) {
                Storage::disk('public')->delete($document->filepath);
            }
            $document->delete();
        }

        $group->delete();

        return response()->json(['message' => 'Grupo y documentos eliminados correctamente.']);
    }

    public function getSemanticDataByFilenames(Request $request): JsonResponse
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
            ->join('document_versions', 'semantic_index.document_version_id', '=', 'document_versions.id')
            ->whereIn('document_versions.id', $ids)
            ->select('document_versions.filename', 'semantic_index.json_layout')
            ->get();

        Log::info('📤 Resultados de la consulta:', $data->toArray());

        return response()->json($data->map(function ($item) {
            return (array) $item;
        }));
    }

        // Nuevo endpoint para obtener el resumen de un documento
    public function getDocumentSummary(int $document_id): JsonResponse
    {
        $document_version = DB::table('document_versions')
            ->where('document_id', $document_id)
            ->where('is_current', true)
            ->first();
        $data = DB::table('semantic_doc_index')
            ->where('document_version_id', $document_version->id)
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

    /**
     * Obtener información detallada del grupo
     */
    public function getGroupDetails(Request $request, int $groupId): JsonResponse
    {
        $user = $request->user();

        // Verificar que el usuario es administrador o tiene acceso al grupo
        $isAdmin = $user->hasRole('admin');
        if (!$isAdmin) {
            $group = DocumentGroup::findOrFail($groupId);
            if (!$group->userHasAccess($user->id)) {
                return response()->json(['message' => 'No tienes acceso a este grupo'], 403);
            }
        }

        $group = DocumentGroup::with(['creator'])
                             ->withCount('documents')
                             ->findOrFail($groupId);

        // Contar usuarios activos manualmente
        $activeUsersCount = $group->users()->wherePivot('active', 1)->count();

        return response()->json([
            'id' => $group->id,
            'name' => $group->name,
            'created_by' => $group->created_by,
            'creator_name' => $group->creator->name ?? 'Usuario eliminado',
            'created_at' => $group->created_at,
            'is_private' => $group->is_private,
            'document_count' => $group->documents_count,
            'member_count' => $activeUsersCount
        ]);
    }

    /**
     * Obtener miembros del grupo
     */
    public function getGroupMembers(Request $request, int $groupId): JsonResponse
    {
        $user = $request->user();

        // Verificar que el usuario es administrador o tiene acceso al grupo
        $isAdmin = $user->hasRole('admin');
        if (!$isAdmin) {
            $group = DocumentGroup::findOrFail($groupId);
            if (!$group->userHasAccess($user->id)) {
                return response()->json(['message' => 'No tienes acceso a este grupo'], 403);
            }
        }

        $group = DocumentGroup::findOrFail($groupId);

        $members = $group->users()
                        ->select(['users.id', 'users.name', 'users.email'])
                        ->withPivot(['active', 'can_edit', 'created_at'])
                        ->wherePivot('active', 1)
                        ->orderBy('pivot_created_at', 'asc')
                        ->get()
                        ->map(function ($member) {
                            return [
                                'id' => $member->id,
                                'name' => $member->name,
                                'email' => $member->email,
                                'permission_type' => $member->pivot->can_edit,
                                'active' => $member->pivot->active,
                                'joined_at' => $member->pivot->created_at
                            ];
                        });

        return response()->json($members);
    }

    /**
     * Subir una nueva versión de un documento existente
     */
    public function uploadNewVersion(Request $request, int $document_id): JsonResponse
    {
        $request->validate([
            'document' => 'required|file|mimes:pdf|max:51200', // máximo 50MB
            'comment' => 'required|string|max:1000',
        ]);

        try {
            // Buscar el documento sin el scope global
            $document = Document::withoutGlobalScope('hasCurrentVersion')
                ->findOrFail($document_id);

            // Verificar permisos del usuario
            $user = $request->user();
            $group = $document->group;

            if (!$group->userHasAccess($user->id)) {
                return response()->json(['message' => 'No tienes acceso a este documento'], 403);
            }

            if (!$group->userCanEdit($user->id)) {
                return response()->json(['message' => 'No tienes permisos de edición en este grupo'], 403);
            }

            // Guardar el archivo
            $file = $request->file('document');
            $filename = $file->getClientOriginalName();
            $filepath = $file->store('documents', 'public');

            $fileData = [
                'filename' => $filename,
                'filepath' => $filepath,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ];

            Log::info("Iniciando subida de nueva versión", [
                'document_id' => $document_id,
                'filename' => $filename,
                'user_id' => $user->id,
            ]);

            // Despachar el job
            DocumentVersionAdder::dispatch(
                app(SiiService::class),
                $fileData,
                $document,
                $user->id,
                $request->input('comment')
            )->onQueue('docAnalysis');

            return response()->json([
                'success' => true,
                'message' => 'Nueva versión en procesamiento',
                'document_id' => $document_id,
            ], 202); // 202 Accepted (procesamiento asíncrono)

        } catch (\Exception $e) {
            Log::error('Error al subir nueva versión:', [
                'document_id' => $document_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al subir nueva versión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Endpoint para probar el evento DocumentsProcessed
     */
    public function testDocumentsProcessedEvent(Request $request): JsonResponse
    {
        $request->validate([
            'group_id' => 'required|integer',
            'user_id' => 'nullable|string' // UUID opcional, usa el usuario autenticado por defecto
        ]);

        $groupId = $request->group_id;
        $userId = $request->user_id ?? $request->user()->id;

        try {
            // Verificar que el grupo existe
            $group = DocumentGroup::findOrFail($groupId);

            // Disparar el evento DocumentsProcessed
            $numUnsuccessfulDocuments = 0; // Ajusta este valor según tu lógica
            event(new DocumentsProcessed($groupId, $userId, $numUnsuccessfulDocuments));

            return response()->json([
                'success' => true,
                'message' => 'Evento DocumentsProcessed disparado exitosamente',
                'data' => [
                    'group_id' => $groupId,
                    'user_id' => $userId,
                    'group_name' => $group->name,
                    'timestamp' => now()->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al probar evento DocumentsProcessed:', [
                'group_id' => $groupId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al disparar el evento: ' . $e->getMessage()
            ], 500);
        }
    }
}

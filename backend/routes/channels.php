<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use App\Models\DocumentVersion;
use App\Models\User;

Broadcast::channel('documents', function () {
    // TODO: ahora mismo, esto no loguea nada, porque se está usando el canal público "documents".
    // En cambio, esta función es para un canal privado "documents".
    Log::info("User is attempting to listen to documents channel.");
    return true;
});

/**
 * Canal privado para notificaciones de comentarios en un document_version específico
 * Solo usuarios con acceso al grupo del documento pueden escuchar este canal
 */
Broadcast::channel('document-version.{documentVersionId}', function (User $user, int $documentVersionId) {
    try {
        // Obtener la versión del documento
        $documentVersion = DocumentVersion::with(['document.group.users'])->findOrFail($documentVersionId);

        // Verificar si el usuario tiene acceso al grupo del documento
        $document = $documentVersion->document;
        $group = $document->group;

        // El usuario debe estar en el grupo y estar activo
        $hasAccess = $group->users()
            ->where('users.id', $user->id)
            ->where('users_groups.active', 1)
            ->exists();

        if ($hasAccess) {
            Log::info("User {$user->id} authorized to listen to document-version.{$documentVersionId}");
            return ['id' => $user->id, 'name' => $user->name];
        }

        Log::warning("User {$user->id} denied access to document-version.{$documentVersionId}");
        return false;

    } catch (\Exception $e) {
        Log::error("Error authorizing channel document-version.{$documentVersionId}", [
            'user_id' => $user->id,
            'error' => $e->getMessage(),
        ]);
        return false;
    }
});

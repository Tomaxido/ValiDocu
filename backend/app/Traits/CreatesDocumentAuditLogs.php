<?php

namespace App\Traits;

use App\Models\DocumentAuditLog;
use Illuminate\Support\Facades\Auth;

/**
 * Trait para automatizar la creación de logs de auditoría de documentos
 * Versión simplificada con solo 4 acciones: subida, descarga, eliminación, re-subida
 */
trait CreatesDocumentAuditLogs
{
    /**
     * Crear un log de auditoría para el documento
     */
    protected function createAuditLog(
        int $documentId,
        string $action,
        ?int $documentVersionId = null,
        ?string $comment = null,
        ?array $metadata = null,
        ?string $userId = null
    ): DocumentAuditLog {
        // Si no se proporciona usuario, usar el usuario autenticado
        if (!$userId && Auth::check()) {
            $userId = Auth::id();
        }

        return DocumentAuditLog::createLog(
            $documentId,
            $action,
            $documentVersionId,
            $comment,
            $metadata,
            $userId
        );
    }

    /**
     * Log para subida de documento (primera vez)
     */
    protected function logDocumentUploaded(int $documentId, int $documentVersionId, ?string $comment = null): DocumentAuditLog
    {
        return $this->createAuditLog(
            $documentId,
            DocumentAuditLog::ACTION_UPLOADED,
            $documentVersionId,
            $comment ?: 'Documento subido por primera vez'
        );
    }

    /**
     * Log para re-subida de documento (nueva versión)
     */
    protected function logDocumentReuploaded(
        int $documentId, 
        int $documentVersionId, 
        ?string $comment = null,
        ?int $versionNumber = null,
        ?array $metadata = null,
        ?string $userId = null
    ): DocumentAuditLog {
        // Si no se proporciona comentario, crear uno con el número de versión si está disponible
        if (!$comment && $versionNumber) {
            $comment = "Nueva versión subida v{$versionNumber}";
        } elseif (!$comment) {
            $comment = 'Nueva versión del documento subida';
        }
        
        return $this->createAuditLog(
            $documentId,
            DocumentAuditLog::ACTION_REUPLOADED,
            $documentVersionId,
            $comment,
            $metadata,
            $userId
        );
    }

    /**
     * Log para descarga de documento
     */
    protected function logDocumentDownloaded(
        int $documentId, 
        ?int $documentVersionId = null, 
        ?string $comment = null,
        ?array $metadata = null
    ): DocumentAuditLog {
        return $this->createAuditLog(
            $documentId,
            DocumentAuditLog::ACTION_DOWNLOADED,
            $documentVersionId,
            $comment ?: 'Documento descargado',
            $metadata
        );
    }

    /**
     * Log para eliminación de documento
     */
    protected function logDocumentDeleted(int $documentId, ?int $documentVersionId = null, ?string $comment = null): DocumentAuditLog
    {
        return $this->createAuditLog(
            $documentId,
            DocumentAuditLog::ACTION_DELETED,
            $documentVersionId,
            $comment ?: 'Documento eliminado'
        );
    }
}
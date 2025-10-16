<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * DocumentAuditLog Model
 * 
 * Modelo para gestionar el historial de trazabilidad de documentos.
 * Almacena todas las acciones realizadas sobre documentos para auditoría y seguimiento.
 */
class DocumentAuditLog extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'document_audit_logs';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'document_id',
        'document_version_id',
        'action',
        'comment',
        'metadata',
        'user_id',
        'ip_address',
        'user_agent',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Constantes para las acciones disponibles
     */
    public const ACTION_UPLOADED = 'uploaded';
    public const ACTION_DOWNLOADED = 'downloaded';
    public const ACTION_DELETED = 'deleted';
    public const ACTION_REUPLOADED = 'reuploaded';

    /**
     * Array de todas las acciones disponibles
     */
    public static function getAvailableActions(): array
    {
        return [
            self::ACTION_UPLOADED,
            self::ACTION_DOWNLOADED,
            self::ACTION_DELETED,
            self::ACTION_REUPLOADED,
        ];
    }

    /**
     * Obtener etiquetas amigables para las acciones
     */
    public static function getActionLabels(): array
    {
        return [
            self::ACTION_UPLOADED => 'Documento subido',
            self::ACTION_DOWNLOADED => 'Documento descargado',
            self::ACTION_DELETED => 'Documento eliminado',
            self::ACTION_REUPLOADED => 'Nueva versión subida',
        ];
    }

    /**
     * Relación con el documento
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * Relación con la versión del documento
     */
    public function documentVersion(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class);
    }

    /**
     * Relación con el usuario que realizó la acción
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope para obtener logs de un documento específico
     */
    public function scopeForDocument($query, $documentId)
    {
        return $query->where('document_id', $documentId);
    }

    /**
     * Scope para obtener logs de un usuario específico
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope para obtener logs de una acción específica
     */
    public function scopeForAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope para obtener logs en orden cronológico (más reciente primero)
     */
    public function scopeChronological($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Scope para obtener logs con información relacionada
     */
    public function scopeWithRelations($query)
    {
        return $query->with(['document', 'documentVersion', 'user']);
    }

    /**
     * Obtener la etiqueta amigable de la acción
     */
    public function getActionLabelAttribute(): string
    {
        $labels = self::getActionLabels();
        return $labels[$this->action] ?? $this->action;
    }

    /**
     * Método estático para crear un log de manera sencilla
     */
    public static function createLog(
        int $documentId,
        string $action,
        ?int $documentVersionId = null,
        ?string $comment = null,
        ?array $metadata = null,
        ?string $userId = null
    ): self {
        return self::create([
            'document_id' => $documentId,
            'document_version_id' => $documentVersionId,
            'action' => $action,
            'comment' => $comment,
            'metadata' => $metadata,
            'user_id' => $userId,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ]);
    }

    /**
     * Método para obtener el timeline completo de un documento
     */
    public static function getDocumentTimeline(int $documentId): \Illuminate\Database\Eloquent\Collection
    {
        return self::forDocument($documentId)
            ->withRelations()
            ->chronological()
            ->get();
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentComment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'document_comments';

    protected $fillable = [
        'document_version_id',
        'user_id',
        'comment',
        'is_edited',
    ];

    protected $casts = [
        'is_edited' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the document version this comment belongs to
     */
    public function documentVersion(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'document_version_id');
    }

    /**
     * Get the user who created this comment
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get time since comment was created
     */
    public function getTimeAgoAttribute(): string
    {
        return $this->created_at->diffForHumans();
    }

    /**
     * Check if comment has been edited
     */
    public function hasBeenEdited(): bool
    {
        return $this->is_edited === 1;
    }

    /**
     * Mark comment as edited
     */
    public function markAsEdited(): bool
    {
        return $this->update(['is_edited' => 1]);
    }

    /**
     * Scope to get comments for a specific document version
     */
    public function scopeForDocumentVersion($query, int $documentVersionId)
    {
        return $query->where('document_version_id', $documentVersionId);
    }

    /**
     * Scope to get comments by a specific user
     */
    public function scopeByUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to order by most recent
     */
    public function scopeRecent($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Scope to order by oldest first
     */
    public function scopeOldest($query)
    {
        return $query->orderBy('created_at', 'asc');
    }

    /**
     * Check if user can edit this comment
     */
    public function canBeEditedBy(string $userId): bool
    {
        return $this->user_id === $userId;
    }

    /**
     * Check if user can delete this comment
     */
    public function canBeDeletedBy(string $userId): bool
    {
        return $this->user_id === $userId;
    }
}

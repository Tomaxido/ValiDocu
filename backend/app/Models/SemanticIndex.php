<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SemanticIndex extends Model
{
    use HasFactory;

    protected $table = 'semantic_index';

    protected $fillable = [
        'document_version_id',
        'document_page_id',
        'document_group_id',
        'json_layout',
        'resumen',
        'archivo',
        'embedding',
    ];

    protected $casts = [
        'json_layout' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the document version this semantic index belongs to
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'document_version_id');
    }

    /**
     * Get the document page this semantic index belongs to
     */
    public function page(): BelongsTo
    {
        return $this->belongsTo(DocumentPage::class, 'document_page_id');
    }

    /**
     * Get the document group this semantic index belongs to
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(DocumentGroup::class, 'document_group_id');
    }

    /**
     * Get the document through version relationship
     */
    public function document()
    {
        return $this->hasOneThrough(
            Document::class,
            DocumentVersion::class,
            'id', // Foreign key on document_versions
            'id', // Foreign key on documents
            'document_version_id', // Local key on semantic_index
            'document_id' // Local key on document_versions
        );
    }

    /**
     * Scope to get semantic index entries for current versions
     */
    public function scopeCurrentVersions($query)
    {
        return $query->whereHas('version', function ($q) {
            $q->where('is_current', true);
        });
    }

    /**
     * Scope to filter by document group
     */
    public function scopeOfGroup($query, int $groupId)
    {
        return $query->where('document_group_id', $groupId);
    }

    /**
     * Scope to filter by page
     */
    public function scopeOfPage($query, int $pageId)
    {
        return $query->where('document_page_id', $pageId);
    }
}

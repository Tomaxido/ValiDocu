<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SemanticDocIndex extends Model
{
    use HasFactory;

    protected $table = 'semantic_doc_index';

    protected $fillable = [
        'document_version_id',
        'document_group_id',
        'json_layout',
        'json_global',
        'resumen',
        'archivo',
        'embedding',
    ];

    protected $casts = [
        'json_layout' => 'array',
        'json_global' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the document version this semantic doc index belongs to
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'document_version_id');
    }

    /**
     * Get the document group this semantic doc index belongs to
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
            'document_version_id', // Local key on semantic_doc_index
            'document_id' // Local key on document_versions
        );
    }

    /**
     * Scope to get semantic doc index entries for current versions
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
     * Get specific field from json_global
     */
    public function getGlobalField(string $fieldKey)
    {
        return $this->json_global[$fieldKey] ?? null;
    }

    /**
     * Get specific field from json_layout
     */
    public function getLayoutField(string $fieldKey)
    {
        return $this->json_layout[$fieldKey] ?? null;
    }

    /**
     * Check if document has global JSON data
     */
    public function hasGlobalData(): bool
    {
        return !empty($this->json_global);
    }

    /**
     * Check if document has layout data
     */
    public function hasLayout(): bool
    {
        return !empty($this->json_layout);
    }
}

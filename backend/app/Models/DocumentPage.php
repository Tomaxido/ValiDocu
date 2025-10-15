<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DocumentPage extends Model
{
    use HasFactory;

    protected $table = 'document_pages';

    protected $fillable = [
        'document_version_id',
        'page_number',
        'image_path',
        'json_layout',
    ];

    protected $casts = [
        'page_number' => 'integer',
        'json_layout' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the document version this page belongs to
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'document_version_id');
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
            'document_version_id', // Local key on document_pages
            'document_id' // Local key on document_versions
        );
    }

    /**
     * Get semantic index entry for this page
     */
    public function semanticIndex()
    {
        return $this->hasOne(SemanticIndex::class, 'document_page_id');
    }

    /**
     * Get the full image path
     */
    public function getFullImagePathAttribute(): ?string
    {
        return $this->image_path ? storage_path('app/' . $this->image_path) : null;
    }

    /**
     * Check if page has layout data
     */
    public function hasLayout(): bool
    {
        return !empty($this->json_layout);
    }

    /**
     * Extract specific field from layout JSON
     */
    public function getLayoutField(string $fieldKey)
    {
        return $this->json_layout[$fieldKey] ?? null;
    }

    /**
     * Get all text content from layout
     */
    public function getAllTextAttribute(): string
    {
        $text = '';
        
        if ($this->json_layout) {
            foreach ($this->json_layout as $field) {
                if (isset($field['text'])) {
                    $text .= ' ' . $field['text'];
                }
            }
        }
        
        return trim($text);
    }

    /**
     * Scope to get pages with layout data
     */
    public function scopeWithLayout($query)
    {
        return $query->whereNotNull('json_layout');
    }
}

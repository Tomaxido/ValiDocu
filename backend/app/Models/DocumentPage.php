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
     * Get semantic index entries for this page
     */
    public function semanticIndexEntries()
    {
        return $this->hasMany(SemanticIndex::class);
    }

    /**
     * Get semantic doc index for this page
     */
    public function semanticDocIndex()
    {
        return $this->hasOne(SemanticDocIndex::class);
    }

    /**
     * Get the full image path
     */
    public function getFullImagePathAttribute(): ?string
    {
        return $this->image_path ? storage_path('app/' . $this->image_path) : null;
    }

    /**
     * Check if page has OCR text
     */
    public function hasOcrText(): bool
    {
        return !empty($this->ocr_text);
    }

    /**
     * Check if page has layout data
     */
    public function hasLayout(): bool
    {
        return !empty($this->layout_json);
    }

    /**
     * Get page dimensions as string
     */
    public function getDimensionsAttribute(): ?string
    {
        if ($this->width_px && $this->height_px) {
            return "{$this->width_px} x {$this->height_px} px";
        }
        return null;
    }

    /**
     * Get aspect ratio
     */
    public function getAspectRatioAttribute(): ?float
    {
        if ($this->width_px && $this->height_px && $this->height_px > 0) {
            return round($this->width_px / $this->height_px, 2);
        }
        return null;
    }

    /**
     * Extract specific field from layout JSON
     */
    public function getLayoutField(string $fieldKey)
    {
        return $this->layout_json[$fieldKey] ?? null;
    }

    /**
     * Get all text content (OCR + layout)
     */
    public function getAllTextAttribute(): string
    {
        $text = $this->ocr_text ?? '';
        
        if ($this->layout_json) {
            foreach ($this->layout_json as $field) {
                if (isset($field['text'])) {
                    $text .= ' ' . $field['text'];
                }
            }
        }
        
        return trim($text);
    }

    /**
     * Scope to get pages with OCR text
     */
    public function scopeWithOcr($query)
    {
        return $query->whereNotNull('ocr_text');
    }

    /**
     * Scope to get pages with layout data
     */
    public function scopeWithLayout($query)
    {
        return $query->whereNotNull('layout_json');
    }
}

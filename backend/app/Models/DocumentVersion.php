<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DocumentVersion extends Model
{
    use HasFactory;

    protected $table = 'document_versions';

    protected $fillable = [
        'document_id',
        'version_number',
        'filename',
        'filepath',
        'mime_type',
        'file_size',
        'page_count',
        'due_date',
        'normative_gap',
        'checksum_sha256',
        'uploaded_by',
        'is_current',
    ];

    protected $casts = [
        'version_number' => 'integer',
        'file_size' => 'integer',
        'page_count' => 'integer',
        'due_date' => 'integer',
        'normative_gap' => 'integer',
        'is_current' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the parent document
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * Get the user who uploaded this version
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Get all pages for this version
     */
    public function pages(): HasMany
    {
        return $this->hasMany(DocumentPage::class)->orderBy('page_number');
    }

    /**
     * Get analyses for this version
     */
    public function analyses(): HasMany
    {
        return $this->hasMany(DocumentAnalysis::class);
    }

    /**
     * Get semantic doc index for this version
     */
    public function semanticDocIndex()
    {
        return $this->hasOne(SemanticDocIndex::class);
    }

    /**
     * Get semantic index entries for this version
     */
    public function semanticIndexEntries(): HasMany
    {
        return $this->hasMany(SemanticIndex::class);
    }

    /**
     * Scope to get only current versions
     */
    public function scopeCurrent($query)
    {
        return $query->where('is_current', true);
    }

    /**
     * Get the full file path
     */
    public function getFullPathAttribute(): string
    {
        return storage_path('app/' . $this->filepath);
    }

    /**
     * Get human-readable file size
     */
    public function getFileSizeHumanAttribute(): string
    {
        if (!$this->file_size) {
            return 'Unknown';
        }

        $units = ['B', 'KB', 'MB', 'GB'];
        $size = $this->file_size;
        $unitIndex = 0;

        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }

        return round($size, 2) . ' ' . $units[$unitIndex];
    }

    /**
     * Check if this is a PDF document
     */
    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    /**
     * Check if this is an image
     */
    public function isImage(): bool
    {
        return str_starts_with($this->mime_type ?? '', 'image/');
    }

    /**
     * Get version label (e.g., "v1", "v2")
     */
    public function getVersionLabelAttribute(): string
    {
        return 'v' . $this->version_number;
    }

    /**
     * Set as current version for the document
     */
    public function setCurrent(): bool
    {
        // Begin transaction
        return \DB::transaction(function () {
            // Unset other current versions
            static::where('document_id', $this->document_id)
                ->where('id', '!=', $this->id)
                ->update(['is_current' => false]);

            // Set this as current
            $this->update(['is_current' => true]);

            // Update document pointer
            return $this->document->update(['current_version_id' => $this->id]);
        });
    }

    /**
     * Get time since upload
     */
    public function getTimeAgoAttribute(): string
    {
        return $this->created_at->diffForHumans();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_group_id',
        'document_type_id',
        'status',
    ];

    protected $casts = [
        'status' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Los atributos que se deben anexar a la representación JSON del modelo.
     */
    protected $appends = [
        'filename',
        'filepath',
        'mime_type',
        'due_date',
        'normative_gap',
        'pages', // Agregar páginas de la versión actual
    ];

    /**
     * Get the document group this document belongs to
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(DocumentGroup::class, 'document_group_id');
    }

    /**
     * Get the current active version of this document
     */
    public function currentVersion(): HasMany
    {
        return $this->hasMany(DocumentVersion::class)->where('is_current', true)->limit(1);
    }

    /**
     * Get all versions of this document
     */
    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class)->orderBy('version_number');
    }

    /**
     * Get the document type
     */
    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class);
    }

    /**
     * Get all analyses through versions
     */
    public function analyses()
    {
        return $this->hasManyThrough(
            DocumentAnalysis::class,
            DocumentVersion::class,
            'document_id',
            'document_version_id'
        );
    }

    /**
     * Get the latest version number
     */
    public function getLatestVersionNumberAttribute(): int
    {
        return $this->versions()->max('version_number') ?? 0;
    }

    /**
     * Create a new version for this document
     */
    public function createVersion(array $data): DocumentVersion
    {
        $nextVersionNumber = $this->latestVersionNumber + 1;

        $version = $this->versions()->create([
            'version_number' => $nextVersionNumber,
            'filename' => $data['filename'],
            'filepath' => $data['filepath'],
            'mime_type' => $data['mime_type'] ?? null,
            'file_size' => $data['file_size'] ?? null,
            'page_count' => $data['page_count'] ?? 1,
            'due_date' => $data['due_date'] ?? 0,
            'normative_gap' => $data['normative_gap'] ?? 0,
            'checksum_sha256' => $data['checksum_sha256'] ?? null,
            'uploaded_by' => $data['uploaded_by'] ?? auth()->id(),
            'is_current' => false,
        ]);

        return $version;
    }

    /**
     * Set a version as current
     */
    public function setCurrentVersion(DocumentVersion $version): bool
    {
        if ($version->document_id !== $this->id) {
            throw new \InvalidArgumentException('Version does not belong to this document');
        }

        return \DB::transaction(function () use ($version) {
            // Unset all current flags
            $this->versions()->update(['is_current' => false]);
            
            // Set new current
            return $version->update(['is_current' => true]);
        });
    }

    /**
     * Get version by number
     */
    public function getVersion(int $versionNumber): ?DocumentVersion
    {
        return $this->versions()->where('version_number', $versionNumber)->first();
    }

    /**
     * Check if document has multiple versions
     */
    public function hasMultipleVersions(): bool
    {
        return $this->versions()->count() > 1;
    }

    /**
     * Get version history (ordered newest to oldest)
     */
    public function getVersionHistory()
    {
        return $this->versions()
            ->orderByDesc('version_number')
            ->with('uploader')
            ->get();
    }

    /**
     * Scope to get documents with their current version
     */
    public function scopeWithCurrentVersion($query)
    {
        return $query->with(['versions' => function ($query) {
            $query->where('is_current', true);
        }]);
    }

    /**
     * Scope to get documents by type
     */
    public function scopeOfType($query, $typeId)
    {
        return $query->where('document_type_id', $typeId);
    }

    
    /**
     * Get the filename from current version
     */
    public function getFilenameAttribute(): ?string
    {
        // Si ya se cargó la relación currentVersion, usarla
        if ($this->relationLoaded('currentVersion')) {
            $versions = $this->getRelation('currentVersion');
            return $versions->first()?->filename;
        }
        $currentVersion = $this->versions()->where('is_current', true)->first();
        return $currentVersion?->filename;
    }

    /**
     * Get the filepath from current version
     */
    public function getFilepathAttribute(): ?string
    {
        if ($this->relationLoaded('currentVersion')) {
            $versions = $this->getRelation('currentVersion');
            return $versions->first()?->filepath;
        }
        $currentVersion = $this->versions()->where('is_current', true)->first();
        return $currentVersion?->filepath;
    }

    /**
     * Get the mime type from current version
     */
    public function getMimeTypeAttribute(): ?string
    {
        if ($this->relationLoaded('currentVersion')) {
            $versions = $this->getRelation('currentVersion');
            return $versions->first()?->mime_type;
        }
        $currentVersion = $this->versions()->where('is_current', true)->first();
        return $currentVersion?->mime_type;
    }

    /**
     * Get the due date from current version
     */
    public function getDueDateAttribute(): ?int
    {
        if ($this->relationLoaded('currentVersion')) {
            $versions = $this->getRelation('currentVersion');
            return $versions->first()?->due_date;
        }
        $currentVersion = $this->versions()->where('is_current', true)->first();
        return $currentVersion?->due_date;
    }

    /**
     * Get the normative gap from current version
     */
    public function getNormativeGapAttribute(): ?int
    {
        if ($this->relationLoaded('currentVersion')) {
            $versions = $this->getRelation('currentVersion');
            return $versions->first()?->normative_gap;
        }
        $currentVersion = $this->versions()->where('is_current', true)->first();
        return $currentVersion?->normative_gap;
    }

    /**
     * Get the pages from current version
     */
    public function getPagesAttribute()
    {
        if ($this->relationLoaded('currentVersion')) {
            $versions = $this->getRelation('currentVersion');
            $currentVersion = $versions->first();
            if ($currentVersion && $currentVersion->relationLoaded('pages')) {
                return $currentVersion->pages;
            }
            return $currentVersion?->pages()->orderBy('page_number')->get() ?? collect();
        }
        $currentVersion = $this->versions()->where('is_current', true)->first();
        return $currentVersion?->pages()->orderBy('page_number')->get() ?? collect();
    }
}

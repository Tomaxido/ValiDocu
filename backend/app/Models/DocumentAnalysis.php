<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentAnalysis extends Model
{
    protected $fillable = ['document_version_id','status','summary','meta'];

    protected $casts = [
        'meta' => 'array',
    ];

    public function version(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'document_version_id');
    }

    public function document(): BelongsTo
    {
        // Acceso al documento a través de la versión
        return $this->version()->getRelated()->document();
    }

    public function issues(): HasMany
    {
        return $this->hasMany(AnalysisIssue::class, 'document_analysis_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentAnalysis extends Model
{
    protected $fillable = ['document_id','status','summary','meta'];

    protected $casts = [
        'meta' => 'array',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function issues(): HasMany
    {
        return $this->hasMany(AnalysisIssue::class, 'document_analysis_id');
    }
}

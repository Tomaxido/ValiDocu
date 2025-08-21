<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentAnalysis extends Model
{
    protected $fillable = ['document_id','status','summary','meta'];

    protected $casts = [
        'meta' => 'array',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function issues()
    {
        return $this->hasMany(AnalysisIssue::class, 'document_analysis_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnalysisIssue extends Model
{
    protected $fillable = [
        'document_analysis_id','field_key','issue_type','message',
        'suggestion','confidence','status','evidence'
    ];

    protected $casts = [
        'evidence' => 'array',
    ];

    public function analysis()
    {
        return $this->belongsTo(DocumentAnalysis::class, 'document_analysis_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Issue extends Model
{
    protected $table = 'analysis_issues';
    protected $guarded = [];

    protected $casts = [
        'confidence' => 'float',
        'evidence'   => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function status(): BelongsTo
    {
        return $this->belongsTo(SuggestionStatus::class, 'status_id');
    }
}

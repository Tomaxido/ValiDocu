<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SuggestionStatus extends Model
{
    protected $table = 'suggestion_status';
    protected $guarded = [];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class, 'status_id');
    }
}

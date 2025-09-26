<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentGroup extends Model
{
    protected $fillable = ['name', 'status'];

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Permission extends Model
{
    protected $fillable = ['key','description'];

    protected $keyType = 'int';
    public $incrementing = true;

    public function roles()
    {
        return $this->belongsToMany(Role::class)->withTimestamps();
    }
}

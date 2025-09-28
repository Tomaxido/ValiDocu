<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentGroup extends Model
{
    protected $fillable = ['name', 'status'];

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'users_groups', 'group_id', 'user_id')
                    ->withPivot('active', 'managed_by')
                    ->withTimestamps();
    }

    public function activeUsers()
    {
        return $this->belongsToMany(User::class, 'users_groups', 'group_id', 'user_id')
                    ->withPivot('active', 'managed_by')
                    ->wherePivot('active', 1)
                    ->withTimestamps();
    }

    public function owner()
    {
        return $this->belongsToMany(User::class, 'users_groups', 'group_id', 'user_id')
                    ->withPivot('active', 'managed_by')
                    ->wherePivot('active', 1)
                    ->wherePivot('managed_by', '=', DB::raw('user_id'))
                    ->withTimestamps();
    }
}

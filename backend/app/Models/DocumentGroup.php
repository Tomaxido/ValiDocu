<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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

    // Relación con configuración específica del grupo
    public function fieldSpecs(): HasMany
    {
        return $this->hasMany(GroupFieldSpec::class, 'group_id');
    }

    /**
     * Obtener todos los tipos de documentos configurados para el grupo
     */
    public function getConfiguredDocumentTypesAttribute()
    {
        return DB::table('group_field_specs as gfs')
            ->join('document_types as dt', 'gfs.document_type_id', '=', 'dt.id')
            ->where('gfs.group_id', $this->id)
            ->select('dt.*')
            ->distinct()
            ->get();
    }

    /**
     * Obtener todas las especificaciones de campos para el grupo
     */
    public function getConfiguredFieldSpecsAttribute()
    {
        return DB::table('group_field_specs as gfs')
            ->join('document_field_specs as dfs', 'gfs.field_spec_id', '=', 'dfs.id')
            ->where('gfs.group_id', $this->id)
            ->select('dfs.*')
            ->get();
    }
}

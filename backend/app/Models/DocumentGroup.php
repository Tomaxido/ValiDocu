<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentGroup extends Model
{
    protected $fillable = ['name', 'status', 'is_private', 'created_by'];

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'users_groups', 'group_id', 'user_id')
                    ->withPivot('active', 'managed_by', 'can_edit')
                    ->withTimestamps();
    }

    public function activeUsers()
    {
        return $this->belongsToMany(User::class, 'users_groups', 'group_id', 'user_id')
                    ->withPivot('active', 'managed_by', 'can_edit')
                    ->wherePivot('active', 1)
                    ->withTimestamps();
    }

    public function owner()
    {
        return $this->belongsToMany(User::class, 'users_groups', 'group_id', 'user_id')
                    ->withPivot('active', 'managed_by', 'can_edit')
                    ->wherePivot('active', 1)
                    ->wherePivot('managed_by', '=', DB::raw('user_id'))
                    ->withTimestamps();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function accessRequests(): HasMany
    {
        return $this->hasMany(GroupAccessRequest::class, 'group_id');
    }

    public function pendingAccessRequests(): HasMany
    {
        return $this->hasMany(GroupAccessRequest::class, 'group_id')
                    ->where('status', GroupAccessRequest::STATUS_PENDING);
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

    /**
     * Verificar si un usuario tiene acceso al grupo
     */
    public function userHasAccess($userId): bool
    {
        // Si el grupo es público, todos tienen acceso
        if (!$this->is_private) {
            return true;
        }

        // Si el usuario es el creador, siempre tiene acceso
        if ($this->created_by === $userId) {
            return true;
        }

        // Verificar si el usuario está en la lista de usuarios activos
        return $this->activeUsers()->where('user_id', $userId)->exists();
    }

    /**
     * Verificar si un usuario puede editar el grupo
     */
    public function userCanEdit($userId): bool
    {
        // Si el usuario es el creador, siempre puede editar
        if ($this->created_by === $userId) {
            return true;
        }

        // Verificar permisos específicos del usuario
        $userGroup = $this->activeUsers()
            ->where('user_id', $userId)
            ->first();

        return $userGroup && $userGroup->pivot->can_edit == 1;
    }

    /**
     * Verificar si es un grupo privado
     */
    public function isPrivate(): bool
    {
        return $this->is_private == 1;
    }

    /**
     * Scope para grupos públicos
     */
    public function scopePublic($query)
    {
        return $query->where('is_private', 0);
    }

    /**
     * Scope para grupos privados
     */
    public function scopePrivate($query)
    {
        return $query->where('is_private', 1);
    }

    /**
     * Scope para grupos accesibles por un usuario específico
     */
    public function scopeAccessibleBy($query, $userId)
    {
        return $query->where(function ($q) use ($userId) {
            // Grupos públicos
            $q->where('is_private', 0)
              // O grupos privados donde el usuario es el creador
              ->orWhere('created_by', $userId)
              // O grupos privados donde el usuario tiene acceso activo
              ->orWhereHas('activeUsers', function ($userQuery) use ($userId) {
                  $userQuery->where('user_id', $userId);
              });
        });
    }
}

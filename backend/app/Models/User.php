<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Atributos asignables en masa
     */
    protected $fillable = [
        'id',
        'name',
        'email',
        'password',
    ];

    /**
     * Atributos ocultos en serialización
     */
    protected $hidden = [
        'password',
        // 'remember_token',
    ];

    /**
     * Casts automáticos
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Usar UUID como clave primaria
     */
    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Generar UUID automáticamente si no se entrega
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->getKey()) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    /**
     * Relaciones
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class)->withTimestamps();
    }

    public function documentGroups()
    {
        return $this->belongsToMany(DocumentGroup::class, 'users_groups', 'user_id', 'group_id')
                    ->withPivot('active', 'managed_by', 'can_edit')
                    ->withTimestamps();
    }

    public function activeDocumentGroups()
    {
        return $this->belongsToMany(DocumentGroup::class, 'users_groups', 'user_id', 'group_id')
                    ->withPivot('active', 'managed_by', 'can_edit')
                    ->wherePivot('active', 1)
                    ->withTimestamps();
    }

    /**
     * Obtener todos los grupos accesibles por este usuario (públicos + privados con acceso)
     */
    public function accessibleDocumentGroups()
    {
        return DocumentGroup::accessibleBy($this->id)
                           ->with(['documents', 'users']);
    }

    /**
     * Get all comments made by this user
     */
    public function comments()
    {
        return $this->hasMany(DocumentComment::class, 'user_id');
    }

    public function permissions()
    {
        return Permission::query()
            ->select('permissions.key')
            ->join('permission_role','permission_role.permission_id','=','permissions.id')
            ->join('role_user','role_user.role_id','=','permission_role.role_id')
            ->where('role_user.user_id',$this->id)
            ->distinct();
    }

    /**
     * Helpers
     */
    public function hasRole(string $slug): bool
    {
        return $this->roles()->where('slug', $slug)->exists();
    }

    public function hasPermission(string $key): bool
    {
        return $this->permissions()->where('key', $key)->exists();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupAccessRequest extends Model
{
    protected $fillable = [
        'group_id',
        'requested_user_id',
        'requesting_user_id',
        'permission_type',
        'status',
        'reviewed_by',
        'reviewed_at',
        'request_reason',
        'admin_comment'
    ];

    protected $casts = [
        'reviewed_at' => 'datetime'
    ];

    // Estados de la solicitud
    const STATUS_PENDING = 0;
    const STATUS_APPROVED = 1;
    const STATUS_REJECTED = 2;

    // Tipos de permisos
    const PERMISSION_READ_ONLY = 0;
    const PERMISSION_EDIT = 1;

    public function group(): BelongsTo
    {
        return $this->belongsTo(DocumentGroup::class, 'group_id');
    }

    public function requestedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_user_id');
    }

    public function requestingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requesting_user_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeRejected($query)
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    /**
     * Obtener el texto del estado
     */
    public function getStatusTextAttribute(): string
    {
        return match($this->status) {
            self::STATUS_PENDING => 'Pendiente',
            self::STATUS_APPROVED => 'Aprobada',
            self::STATUS_REJECTED => 'Rechazada',
            default => 'Desconocido'
        };
    }

    /**
     * Obtener el texto del tipo de permiso
     */
    public function getPermissionTextAttribute(): string
    {
        return match($this->permission_type) {
            self::PERMISSION_READ_ONLY => 'Solo lectura',
            self::PERMISSION_EDIT => 'Edición',
            default => 'Desconocido'
        };
    }
}
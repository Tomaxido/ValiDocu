<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentType extends Model
{
    protected $fillable = [
        'nombre_doc',
        'analizar'
    ];

    protected $casts = [
        'analizar' => 'integer',
    ];

    /**
     * Relación con especificaciones de campos del documento
     */
    public function fieldSpecs(): HasMany
    {
        return $this->hasMany(DocumentFieldSpec::class, 'doc_type_id');
    }

    /**
     * Relación con configuraciones de grupos
     */
    public function groupFieldSpecs(): HasMany
    {
        return $this->hasMany(GroupFieldSpec::class, 'document_type_id');
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentFieldSpec extends Model
{
    protected $fillable = [
        'doc_type_id','field_key','label','is_required','datatype',
        'regex','options','suggestion_template','example_text'
    ];

    protected $casts = [
        'options' => 'array',
        'is_required' => 'boolean',
    ];

    public $timestamps = true;

    /**
     * Relación con el tipo de documento
     */
    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'doc_type_id');
    }

    /**
     * Relación con configuraciones de grupos
     */
    public function groupFieldSpecs(): HasMany
    {
        return $this->hasMany(GroupFieldSpec::class, 'field_spec_id');
    }
}

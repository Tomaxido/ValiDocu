<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupFieldSpec extends Model
{
    public $timestamps = false;
    public $incrementing = false;
    protected $primaryKey = null;
    
    protected $fillable = [
        'group_id',
        'field_spec_id', 
        'document_type_id'
    ];

    /**
     * Get the document group that owns this field specification.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(DocumentGroup::class, 'group_id');
    }

    /**
     * Get the field specification.
     */
    public function fieldSpec(): BelongsTo
    {
        return $this->belongsTo(DocumentFieldSpec::class, 'field_spec_id');
    }

    /**
     * Get the document type.
     */
    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'document_type_id');
    }
}
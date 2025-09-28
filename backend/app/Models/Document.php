<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    protected $fillable = ['filename', 'filepath', 'mime_type', 'status', 'document_group_id', 'normative_gap'];

    public function group(): BelongsTo
    {
        return $this->belongsTo(DocumentGroup::class, 'document_group_id');
    }

}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = ['filename', 'filepath', 'mime_type', 'status', 'document_group_id'];

    public function group()
    {
        return $this->belongsTo(DocumentGroup::class, 'document_group_id');
    }

}

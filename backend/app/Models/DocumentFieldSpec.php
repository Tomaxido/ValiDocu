<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentFieldSpec extends Model
{
    protected $fillable = [
        'doc_type','field_key','label','is_required','datatype',
        'regex','options','suggestion_template','example_text'
    ];

    protected $casts = [
        'options' => 'array',
    ];

    public $timestamps = true;
}

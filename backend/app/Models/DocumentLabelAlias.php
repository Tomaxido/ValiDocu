<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DocumentLabelAlias extends Model {
  protected $fillable = ['doc_type','normalized_label','field_key','priority','active'];
}

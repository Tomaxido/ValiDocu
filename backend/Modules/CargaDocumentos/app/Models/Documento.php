<?php

namespace Modules\CargaDocumentos\Models;

use Illuminate\Database\Eloquent\Model;

class Documento extends Model
{
    protected $fillable = [
        'nombre_original',
        'path',
        'tipo',
        'estado_validacion',
    ];
}

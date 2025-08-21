<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentFieldSpecSeeder extends Seeder
{
    public function run(): void
    {
        // 1) Definimos todas las keys posibles para que TODAS las filas las tengan
        $default = [
            'doc_type'            => null,
            'field_key'           => null,
            'label'               => null,
            'is_required'         => true,
            'datatype'            => null,
            'regex'               => null,
            'options'             => null, // json
            'suggestion_template' => null,
            'example_text'        => null,
            'created_at'          => now(),
            'updated_at'          => now(),
        ];

        // 2) Tu data (OJO: la regex con barras escapadas \\)
        $rows = [
            ['doc_type'=>'acuerdo','field_key'=>'rut_emisor','label'=>'RUT Emisor','is_required'=>true,'datatype'=>'rut','regex'=>'^\\d{1,2}\\.?\\d{3}\\.?\\d{3}-[\\dkK]$','suggestion_template'=>'Agregar RUT del emisor con formato 12.345.678-9.'],
            ['doc_type'=>'acuerdo','field_key'=>'rut_receptor','label'=>'RUT Receptor','is_required'=>true,'datatype'=>'rut','regex'=>'^\\d{1,2}\\.?\\d{3}\\.?\\d{3}-[\\dkK]$','suggestion_template'=>'Indicar RUT del receptor (formato válido).'],
            ['doc_type'=>'acuerdo','field_key'=>'nombre_emisor','label'=>'Nombre Emisor','is_required'=>true,'datatype'=>'string','suggestion_template'=>'Indicar nombre completo del emisor.'],
            ['doc_type'=>'acuerdo','field_key'=>'nombre_receptor','label'=>'Nombre Receptor','is_required'=>true,'datatype'=>'string','suggestion_template'=>'Indicar nombre completo del receptor.'],
            ['doc_type'=>'acuerdo','field_key'=>'empresa_emisor','label'=>'Empresa Emisor','is_required'=>false,'datatype'=>'string','suggestion_template'=>'Indique razón social si corresponde.'],
            ['doc_type'=>'acuerdo','field_key'=>'monto_total','label'=>'Monto Total (CLP)','is_required'=>true,'datatype'=>'money','suggestion_template'=>'Especifique el monto total en CLP. Ej: $1.250.000.'],
            ['doc_type'=>'acuerdo','field_key'=>'fecha','label'=>'Fecha','is_required'=>true,'datatype'=>'date','suggestion_template'=>'Indique fecha AAAA-MM-DD.'],
            ['doc_type'=>'acuerdo','field_key'=>'direccion','label'=>'Dirección','is_required'=>false,'datatype'=>'string','suggestion_template'=>'Indique dirección completa.'],
        ];

        // 3) Normalizamos para que todas las filas tengan exactamente las mismas columnas
        $rows = array_map(fn($r) => array_merge($default, $r), $rows);

        // 4) Usamos UPSERT para evitar duplicados si corres seed más de una vez
        DB::table('document_field_specs')->upsert(
            $rows,
            ['doc_type', 'field_key'], // índice único lógico
            ['label','is_required','datatype','regex','options','suggestion_template','example_text','updated_at'] // columnas a actualizar si existe
        );
    }
}

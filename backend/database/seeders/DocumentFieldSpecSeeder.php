<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentFieldSpecSeeder extends Seeder
{
    public function run(): void
    {
        // 1) Defaults para asegurar todas las columnas
        $default = [
            'doc_type'            => null,
            'field_key'           => null,
            'label'               => null,
            'is_required'         => true,
            'datatype'            => null,
            'regex'               => null,
            'options'             => null,
            'suggestion_template' => null,
            'example_text'        => null,
            'created_at'          => now(),
            'updated_at'          => now(),
        ];

        // 2) Lista de doc_types basada en tus PDFs (normalizados)
        //    Puedes mapear TIPO_DOCUMENTO textual a uno de estos en tu servicio de normalización.
        $DOC_TYPES = [
            'contrato',              // genérico por si lo usas como fallback
            'contrato_simple',
            'formulario_contrato',
            'acuerdo_contractual',
            'contrato_especial',
            'contrato_servicio',
            'contrato_individual',
            'contrato_numerado',
        ];

        // 3) Especificaciones base (se aplican a TODOS los doc_types)
        //    - RUT chileno
        $RUT_REGEX = '^\\d{1,2}\\.?\\d{3}\\.?\\d{3}-[\\dkK]$';
        //    - Fecha DD-MM-YYYY
        $FECHA_REGEX = '^\\d{2}-\\d{2}-\\d{4}$';
        //    - Monto CLP: $1.234.567 o 1.234.567, opcional decimales con coma
        $MONEY_REGEX = '^\\$?\\s?\\d{1,3}(\\.\\d{3})*(,\\d{1,2})?$';

        $baseSpec = [
            // Identificación de partes
            ['field_key'=>'nombre_emisor',    'label'=>'Nombre Emisor',     'datatype'=>'string', 'is_required'=>true,  'suggestion_template'=>'Indique el nombre completo del emisor.'],
            ['field_key'=>'rut_emisor',       'label'=>'RUT Emisor',        'datatype'=>'rut',    'is_required'=>true,  'regex'=>$RUT_REGEX, 'suggestion_template'=>'Ingrese un RUT válido para el emisor (ej: 12.345.678-9).'],

            ['field_key'=>'nombre_receptor',  'label'=>'Nombre Receptor',   'datatype'=>'string', 'is_required'=>true,  'suggestion_template'=>'Indique el nombre completo de la contraparte.'],
            ['field_key'=>'rut_receptor',     'label'=>'RUT Receptor',      'datatype'=>'rut',    'is_required'=>true,  'regex'=>$RUT_REGEX, 'suggestion_template'=>'Ingrese un RUT válido para la contraparte.'],

            // Razón social (opcionales, según documento)
            ['field_key'=>'empresa_emisor',   'label'=>'Empresa Emisor',    'datatype'=>'string', 'is_required'=>false, 'suggestion_template'=>'Indique la razón social del emisor si corresponde.'],
            ['field_key'=>'empresa_receptor', 'label'=>'Empresa Receptor',  'datatype'=>'string', 'is_required'=>false, 'suggestion_template'=>'Indique la razón social de la contraparte si corresponde.'],

            // Metadatos del documento
            ['field_key'=>'direccion',        'label'=>'Dirección',         'datatype'=>'string', 'is_required'=>true,  'suggestion_template'=>'Indique la dirección completa.'],
            ['field_key'=>'fecha',            'label'=>'Fecha de inicio',   'datatype'=>'date',   'is_required'=>true,  'regex'=>$FECHA_REGEX, 'suggestion_template'=>'Indique la fecha en formato DD-MM-YYYY (ej: 25-12-2025).'],
            ['field_key'=>'numero_contrato',  'label'=>'Número de contrato','datatype'=>'string', 'is_required'=>false, 'suggestion_template'=>'Indique el número de contrato si aplica.'],

            // Objeto y monto
            ['field_key'=>'descripcion_servicio','label'=>'Descripción/Servicio','datatype'=>'string','is_required'=>true,'suggestion_template'=>'Describa brevemente el servicio contratado.'],
            ['field_key'=>'monto_total',         'label'=>'Monto total (CLP)',  'datatype'=>'money', 'is_required'=>true,'regex'=>$MONEY_REGEX, 'suggestion_template'=>'Especifique el monto total en CLP (ej: $1.000.000).'],

            // Otros
            ['field_key'=>'observaciones',    'label'=>'Observaciones',     'datatype'=>'string', 'is_required'=>false, 'suggestion_template'=>'Incluya observaciones relevantes si existen.'],
            ['field_key'=>'firmas',           'label'=>'Firmas',            'datatype'=>'string', 'is_required'=>true,  'suggestion_template'=>'Incluya las firmas de ambas partes.'],
        ];

        // 4) Expandimos el spec base a todos los doc_types
        $rows = [];
        foreach ($DOC_TYPES as $dt) {
            foreach ($baseSpec as $spec) {
                $rows[] = array_merge($default, array_merge($spec, ['doc_type'=>$dt]));
            }
        }

        // 5) UPSERT (evita duplicados al re-seedear)
        DB::table('document_field_specs')->upsert(
            $rows,
            ['doc_type', 'field_key'],
            ['label','is_required','datatype','regex','options','suggestion_template','example_text','updated_at']
        );
    }
}

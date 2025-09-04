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

        // 2) DocType objetivo
        $DOC_TYPE = 'CONTRATO DE MUTUO Y MANDATO';

        $RUT_REGEX          = '^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$';
        // Revisa fechas validas con formato DD-MM-YYYY, DD/MM/YYYY y DD.MM.YYYY incluyendo años bisiestos
        // $FECHA_ISO_REGEX    = '^(?:(?:29([-./])02(?:\1)(?:(?:(?:1[6-9]|20)(?:04|08|[2468][048]|[13579][26]))|(?:1600|2[048]00)))|(?:(?:(?:0[1-9]|1\d|2[0-8])([-./])(?:0[1-9]|1[0-2]))|(?:29|30)([-./])(?:0(?:1|[3-9])|(?:1[0-2]))|31([-./])(0[13578]|1[02]))(?:\2|\3|\4)(?:1[6-9]|2\d)\d\d)$';
        $MONEY_REGEX        = '^(?:\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d{1,3}(?:,\d{3})*(?:\.\d+)?)$';               // numero con separador de miles (punto) y decimales (coma)
        // $TASA_REGEX         = '^(?:\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d{1,3}(?:,\d{3})*(?:\.\d+)?)\%$';                      // 0.08%
        $MONEDA_REGEX       = '^(UF|CLP|USD|UTM)$';                              // UF
        // Fecha larga insensible a mayuscular, por ejemplo 17 de septiembre del 2024
        // $FECHA_LARGA_REGEX  = '^(0?[1-9]|[12]\d|3[01])\s+(?:de)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de(?:l)?\s+(\d{4})$';

        $specsMutuoMandato = [
            // Claves económicas
            [
                'field_key' => 'TASA',
                'label' => 'Tasa de interés',
                'datatype' => 'string',
                // 'regex' => $TASA_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Indique la tasa en porcentaje. Ej.: 10%',
                'example_text' => '0.08%',
            ],
            [
                'field_key' => 'MONTO',
                'label' => 'Monto',
                'datatype' => 'money',
                'regex' => $MONEY_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Especifique el monto con separador de miles y coma decimal. Ej.: 1.000.000',
                'example_text' => '295.000.000,00',
            ],
            [
                'field_key' => 'MONEDA',
                'label' => 'Moneda',
                'datatype' => 'string',
                'regex' => $MONEDA_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Indique la moneda (UF, CLP o USD).',
                'example_text' => 'UF',
                'options' => json_encode(['UF','CLP','USD'], JSON_UNESCAPED_UNICODE),
            ],

            // Plazos y fechas
            [
                'field_key' => 'PLAZO',
                'label' => 'Plazo',
                'datatype' => 'string',
                'is_required' => true,
                'suggestion_template' => 'Especifique el plazo en días.',
                'example_text' => '360 días',
            ],
            [
                'field_key' => 'FECHA_EMISION',
                'label' => 'Fecha de emisión',
                'datatype' => 'date',
                // 'regex' => $FECHA_ISO_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Use formato DD/MM/YYYY',
                'example_text' => '2023-09-28',
            ],
            [
                'field_key' => 'FECHA_VENCIMIENTO',
                'label' => 'Fecha de vencimiento',
                'datatype' => 'date',
                // 'regex' => $FECHA_ISO_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Use formato DD/MM/YYYY',
                'example_text' => '2025-12-21',
            ],
            [
                'field_key' => 'FECHA_ESCRITURA',
                'label' => 'Fecha de escritura (texto)',
                'datatype' => 'string',
                // 'regex' => $FECHA_LARGA_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Use formato 17 de septiembre del 2024.',
                'example_text' => '17 de septiembre del 2024',
            ],

            // Ubicación
            [
                'field_key' => 'CIUDAD',
                'label' => 'Ciudad',
                'datatype' => 'string',
                'is_required' => true,
                'suggestion_template' => 'Indique la ciudad. Ej: SAN CARLOS',
                'example_text' => 'SAN CARLOS',
            ],
            [
                'field_key' => 'DIRECCION',
                'label' => 'Dirección',
                'datatype' => 'string',
                'is_required' => true,
                'suggestion_template' => 'Indique la dirección completa. Ej.: ROBERTO ESPINOZA 8 DPTO. 18 MARÍA PINTO, COMUNA DE PEDRO AGUIRRE CERDA',
                'example_text' => 'ROBERTO ESPINOZA 8 DPTO. 18 MARÍA PINTO, COMUNA DE PEDRO AGUIRRE CERDA',
            ],

            // Personas (nombres completos)
            [
                'field_key' => 'NOMBRE_COMPLETO_DEUDOR',
                'label' => 'Nombre completo del deudor',
                'datatype' => 'string',
                'is_required' => true,
                'suggestion_template' => 'Escriba el nombre completo en mayúsculas. Ej.: SIMÓN GABRIEL MÁRQUEZ OLIVARES',
                'example_text' => 'SIMÓN GABRIEL MÁRQUEZ OLIVARES',
            ],
            [
                'field_key' => 'NOMBRE_COMPLETO_CORREDOR',
                'label' => 'Nombre completo del corredor',
                'datatype' => 'string',
                'is_required' => true,
                'suggestion_template' => 'Escriba el nombre completo en mayúsculas. Ej.: DANIELA LUISA PEREIRA LÓPEZ',
                'example_text' => 'DANIELA LUISA PEREIRA LÓPEZ',
            ],

            // RUT de personas
            [
                'field_key' => 'RUT_DEUDOR',
                'label' => 'RUT del deudor',
                'datatype' => 'rut',
                'regex' => $RUT_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Ingrese un RUT válido. Ej.: 21294425-7',
                'example_text' => '21294425-7',
            ],
            [
                'field_key' => 'RUT_CORREDOR',
                'label' => 'RUT del corredor',
                'datatype' => 'rut',
                'regex' => $RUT_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Ingrese un RUT válido. Ej.: 21294425-7',
                'example_text' => '14408828-0',
            ],

            // Empresas y RUT de empresas
            [
                'field_key' => 'EMPRESA_DEUDOR',
                'label' => 'Razón social deudor',
                'datatype' => 'string',
                'is_required' => true,
                'suggestion_template' => 'Indique la razón social en mayúsculas. Ej.: GRUPO TOLEDO, LABRA Y DÍAZ SPA',
                'example_text' => 'GRUPO TOLEDO, LABRA Y DÍAZ SPA',
            ],
            [
                'field_key' => 'EMPRESA_CORREDOR',
                'label' => 'Razón social corredor',
                'datatype' => 'string',
                'is_required' => true,
                'suggestion_template' => 'Indique la razón social en mayúsculas. Ej.: PROYECTOS TOBAR Y SEPÚLVEDA S.A',
                'example_text' => 'PROYECTOS TOBAR Y SEPÚLVEDA S.A',
            ],
            [
                'field_key' => 'EMPRESA_DEUDOR_RUT',
                'label' => 'RUT de empresa del deudor',
                'datatype' => 'rut',
                'regex' => $RUT_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Ingrese el RUT de la empresa del deudor. Ej.: 22316054-2',
                'example_text' => '22316054-2',
            ],
            [
                'field_key' => 'EMPRESA_CORREDOR_RUT',
                'label' => 'RUT de empresa del corredor',
                'datatype' => 'rut',
                'regex' => $RUT_REGEX,
                'is_required' => true,
                'suggestion_template' => 'Ingrese el RUT de la empresa del corredor. Ej.: 22316054-2',
                'example_text' => '10545076-5',
            ],

            // Tipo de documento (lo validamos por igualdad, no por regex)
            [
                'field_key' => 'TIPO_DOCUMENTO',
                'label' => 'Tipo de documento',
                'datatype' => 'string',
                'is_required' => true,
                'regex' => null, // se compara por valor exacto en lógica de análisis
                'suggestion_template' => 'El tipo de documento debe ser exactamente: Contrato de mutuos',
                'example_text' => $DOC_TYPE,
            ],
        ];

        // 5) Construcción de filas para upsert
        $rows = [];
        foreach ($specsMutuoMandato as $spec) {
            $rows[] = array_merge($default, $spec, ['doc_type' => $DOC_TYPE]);
        }

        // 6) UPSERT (evita duplicados al re-seedear)
        DB::table('document_field_specs')->upsert(
            $rows,
            ['doc_type', 'field_key'],
            ['label','is_required','datatype','regex','options','suggestion_template','example_text','updated_at']
        );
    }
}

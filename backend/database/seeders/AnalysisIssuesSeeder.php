<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AnalysisIssuesSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // ⚠️ Ajusta los document_id a tus IDs reales en la tabla documents
        $docs = [
            [
                'document_id'  => 29,
                'doc_type'     => 'contrato_especial',
                'summary'      => 'CONTRATO ESPECIAL entre Elizabeth A. Cortés M. e Industrias Pavez, Retamales y Pérez Ltda. por $8.229.777, fecha 31/07/2025.',
                'date_raw'     => '31/07/2025',
                'invalid_ruts' => ['10.354.746-9', null],
            ],
            [
                'document_id'  => 31,
                'doc_type'     => 'formulario_contrato',
                'summary'      => 'FORMULARIO DE CONTRATO entre Eva E. Guerrero C. y Club Riquelme, Morales y Araya Ltda. por $9.369.891, fecha 28/08/2012.',
                'date_raw'     => '28/08/2012',
                'invalid_ruts' => ['11.760.547-9', '21.097.274-7'],
            ],
            [
                'document_id'  => 25,
                'doc_type'     => 'contrato_individual',
                'summary'      => 'CONTRATO INDIVIDUAL entre Juan Gutiérrez Robles y Mancilla y Rojas S.A., por $10.649.802, fecha 12/04/2024.',
                'date_raw'     => '12/04/2024',
                'invalid_ruts' => ['23.026.388-7', '13.781.808-9'],
            ],
            [
                'document_id'  => 27,
                'doc_type'     => 'contrato_simple',
                'summary'      => 'CONTRATO SIMPLE entre María C. González P. y Holding Valenzuela, Sepúlveda y Silva S.A., por $745.125, fecha 18/08/2025.',
                'date_raw'     => '18/08/2025',
                'invalid_ruts' => ['10182597-0', '10250843-4'],
            ],
            [
                'document_id'  => 23,
                'doc_type'     => 'acuerdo_contractual',
                'summary'      => 'ACUERDO CONTRACTUAL entre Camila L. Rodríguez Rojas y Corporación Núñez, Jara y Valdés Ltda., por $9.869.244, fecha 20/05/2025.',
                'date_raw'     => '20/05/2025',
                'invalid_ruts' => ['17487978-1', '14665781-0'],
            ],
        ];

        foreach ($docs as $d) {
            // 1) Insertar un análisis por documento
            $analysisId = DB::table('document_analyses')->insertGetId([
                'document_id' => $d['document_id'],
                'status'      => 'done',
                'summary'     => $d['summary'],
                'meta'        => json_encode([
                    'doc_type' => $d['doc_type'],
                    'seeded'   => true,
                ]),
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);

            // 2) Insertar issue de FECHA
            DB::table('analysis_issues')->insert([
                'document_analysis_id' => $analysisId,
                'field_key'  => 'fecha',
                'issue_type' => 'FORMAT',
                'message'    => 'La fecha no cumple el formato esperado (DD-MM-YYYY).',
                'suggestion' => 'Reescriba la fecha usando guiones, por ejemplo "20-05-2025".',
                'confidence' => 0.90,
                'status'     => 'TODO',
                'evidence'   => json_encode([
                    'items' => [[
                        'page'     => 1,
                        'label'    => 'FECHA',
                        'raw_text' => $d['date_raw'],
                        'boxes'    => null,
                    ]]
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // 3) Insertar issues de RUT inválidos
            $rutKeys = ['rut_emisor', 'rut_receptor'];
            foreach ($rutKeys as $idx => $fieldKey) {
                $rut = $d['invalid_ruts'][$idx] ?? null;
                if (!$rut) continue;

                DB::table('analysis_issues')->insert([
                    'document_analysis_id' => $analysisId,
                    'field_key'  => $fieldKey,
                    'issue_type' => 'FORMAT',
                    'message'    => 'Formato/Dígito verificador de RUT inválido.',
                    'suggestion' => 'Ingrese un RUT válido (ej: 12.345.678-9).',
                    'confidence' => 0.95,
                    'status'     => 'TODO',
                    'evidence'   => json_encode([
                        'items' => [[
                            'page'     => 1,
                            'label'    => strtoupper($fieldKey),
                            'raw_text' => $rut,
                            'boxes'    => null,
                        ]]
                    ]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }
}

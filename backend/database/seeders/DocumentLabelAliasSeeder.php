<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentLabelAliasSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // Recomendación: tu normalizador debería:
        // - upper(): pasar a mayúsculas
        // - strip accents: quitar acentos (DIRECCION, EMPRESA, etc.)
        // - trim y colapsar espacios / convertir _ a espacio
        //
        // Así estos aliases capturan la mayoría de variaciones del extractor.

        DB::table('document_label_aliases')->upsert([
            // === Tipo de documento ===
            [ 'doc_type'=>null,'normalized_label'=>'TIPO DOCUMENTO','field_key'=>'doc_type_raw','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'TIPO_DOCUMENTO','field_key'=>'doc_type_raw','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === Fecha ===
            [ 'doc_type'=>null,'normalized_label'=>'FECHA','field_key'=>'fecha','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'FECHA DE INICIO','field_key'=>'fecha','priority'=>9,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'FECHA_DE_INICIO','field_key'=>'fecha','priority'=>9,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === Nombres (genérico por si el extractor no separa) ===
            [ 'doc_type'=>null,'normalized_label'=>'NOMBRE COMPLETO','field_key'=>'nombre_any','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'NOMBRE_COMPLETO','field_key'=>'nombre_any','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'NOMBRE','field_key'=>'nombre_any','priority'=>7,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === RUTs ===
            [ 'doc_type'=>null,'normalized_label'=>'RUT','field_key'=>'rut_any','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'RUT_E','field_key'=>'rut_emisor','priority'=>11,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'RUT EMISOR','field_key'=>'rut_emisor','priority'=>11,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'RUT_RECEPTOR','field_key'=>'rut_receptor','priority'=>11,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'RUT RECEPTOR','field_key'=>'rut_receptor','priority'=>11,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === Dirección ===
            [ 'doc_type'=>null,'normalized_label'=>'DIRECCION','field_key'=>'direccion','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'DIRECCIÓN','field_key'=>'direccion','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === Empresas ===
            [ 'doc_type'=>null,'normalized_label'=>'EMPRESA','field_key'=>'empresa_emisor','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            // Si en algún doc apareciera explícito:
            [ 'doc_type'=>null,'normalized_label'=>'EMPRESA EMISOR','field_key'=>'empresa_emisor','priority'=>11,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'EMPRESA RECEPTOR','field_key'=>'empresa_receptor','priority'=>11,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === Monto ===
            [ 'doc_type'=>null,'normalized_label'=>'MONTO','field_key'=>'monto_total','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'MONTO ACORDADO','field_key'=>'monto_total','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'MONTO TOTAL','field_key'=>'monto_total','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === Servicio / Descripción ===
            [ 'doc_type'=>null,'normalized_label'=>'SERVICIO','field_key'=>'descripcion_servicio','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'DESCRIPCION DEL SERVICIO','field_key'=>'descripcion_servicio','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'DESCRIPCION_DEL_SERVICIO','field_key'=>'descripcion_servicio','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === Observaciones ===
            [ 'doc_type'=>null,'normalized_label'=>'OBSERVACIONES','field_key'=>'observaciones','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === Firmas ===
            [ 'doc_type'=>null,'normalized_label'=>'FIRMAS','field_key'=>'firmas','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],

            // === Número de contrato (para "CONTRATO N° ...") ===
            [ 'doc_type'=>null,'normalized_label'=>'CONTRATO N°','field_key'=>'numero_contrato','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'NUMERO CONTRATO','field_key'=>'numero_contrato','priority'=>9,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'NUMERO_DE_CONTRATO','field_key'=>'numero_contrato','priority'=>9,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
        ],
        ['doc_type','normalized_label'],
        ['field_key','priority','active','updated_at']);
    }
}

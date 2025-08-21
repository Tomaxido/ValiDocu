<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentLabelAliasSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        DB::table('document_label_aliases')->upsert([
            [ 'doc_type'=>null,'normalized_label'=>'TIPO DOCUMENTO','field_key'=>'doc_type_raw','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'FECHA','field_key'=>'fecha','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'NOMBRE COMPLETO','field_key'=>'nombre_any','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'RUT','field_key'=>'rut_any','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'DIRECCION','field_key'=>'direccion','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'EMPRESA','field_key'=>'empresa_any','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
            [ 'doc_type'=>null,'normalized_label'=>'MONTO','field_key'=>'monto_total','priority'=>10,'active'=>true,'created_at'=>$now,'updated_at'=>$now ],
        ], ['doc_type','normalized_label'], ['field_key','priority','active','updated_at']);
    }
}

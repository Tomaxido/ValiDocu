<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_types', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('nombre_doc');
            $table->integer('analizar')->default(1); // 1 = true, 0 = false
            $table->timestamps();
        });

        // Insertar registros obligatorios y no obligatorios
        DB::table('document_types')->insert([
            [
                'nombre_doc' => 'ESCRITURA MUTUO',
                'analizar' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_doc' => 'CONTRATO DE MUTUO Y MANDATO',
                'analizar' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_doc' => 'CARNET IDENTIDAD DEUDOR',
                'analizar' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

    }

    public function down(): void
    {
        Schema::dropIfExists('document_types');
    }
};

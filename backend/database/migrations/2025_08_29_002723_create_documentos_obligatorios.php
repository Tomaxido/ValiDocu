<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documentos_obligatorios', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('nombre_doc');
            $table->integer('analizar')->default(1); // 1 = true, 0 = false
            $table->timestamps();
        });

        // Insertar registros obligatorios y no obligatorios
        DB::table('documentos_obligatorios')->insert([
            [
                'nombre_doc' => 'ESCRITURA MUTUO',
                'analizar' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_doc' => 'CARNET IDENTIDAD',
                'analizar' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_obligatorios');
    }
};

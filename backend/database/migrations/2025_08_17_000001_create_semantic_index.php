<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Asegura extensión
        DB::statement("CREATE EXTENSION IF NOT EXISTS vector");

        Schema::create('semantic_index', function (Blueprint $table) {
            $table->increments('id');
            $table->text('resumen')->nullable();
            $table->jsonb('json_layout')->nullable();
            // columna embedding vector(384) vía SQL crudo (Blueprint no tiene 'vector')
            // Creamos tabla primero y luego alter:
        });

        DB::statement("ALTER TABLE semantic_index ADD COLUMN embedding vector(384)");
        DB::statement("ALTER TABLE semantic_index ADD COLUMN archivo text");
        DB::statement("ALTER TABLE semantic_index ADD COLUMN document_id integer");
        DB::statement("ALTER TABLE semantic_index ADD COLUMN document_group_id integer");
    }

    public function down(): void
    {
        Schema::dropIfExists('semantic_index');
    }
};
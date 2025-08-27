<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('semantic_doc_index', function (Blueprint $table) {
            $table->bigIncrements('id');

            // ID del documento maestro (PDF original) -> referencia a documents.id
            $table->foreignId('document_id')
                ->constrained('documents')
                ->cascadeOnDelete();

            // Grupo al que pertenece el documento
            $table->foreignId('document_group_id')
                ->constrained('document_groups')
                ->cascadeOnDelete();

            $table->text('resumen')->nullable();

            // Layout consolidado por documento y JSON global (label -> best value)
            $table->json('json_layout')->nullable();
            $table->json('json_global')->nullable();

            // Embedding del resumen (guárdalo como JSON; si luego usas pgvector, lo migras)
            $table->json('embedding')->nullable();

            // Nombre de archivo de última página procesada (opcional, para trazabilidad)
            $table->string('archivo')->nullable();

            $table->timestamps();

            // Un registro por documento maestro
            $table->unique('document_id', 'uq_semantic_doc_index_document');
            $table->index('document_group_id', 'idx_semantic_doc_index_group');
        });

        // Opcional: si usas PostgreSQL, convertir a JSONB y crear índices GIN
        try {
            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE semantic_doc_index ALTER COLUMN json_layout TYPE JSONB USING json_layout::jsonb');
                DB::statement('ALTER TABLE semantic_doc_index ALTER COLUMN json_global TYPE JSONB USING json_global::jsonb');

                DB::statement('CREATE INDEX IF NOT EXISTS idx_semantic_doc_index_json_layout ON semantic_doc_index USING GIN (json_layout)');
                DB::statement('CREATE INDEX IF NOT EXISTS idx_semantic_doc_index_json_global ON semantic_doc_index USING GIN (json_global)');
            }
        } catch (\Throwable $e) {
            // No romper migración si el motor no soporta JSONB/GIN en este momento
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('semantic_doc_index');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Convertir la columna de JSONB a VECTOR
        DB::statement("
            ALTER TABLE semantic_doc_index
            ALTER COLUMN embedding
            TYPE vector(384)
            USING (
                string_to_array(
                    trim(both '[]' from embedding::text),
                    ','
                )::float8[]
            )::vector
        ");
    }

    public function down(): void
    {
        // Volver atrás, a JSONB
        DB::statement("
            ALTER TABLE semantic_doc_index
            ALTER COLUMN embedding
            TYPE jsonb
            USING embedding::jsonb
        ");
    }
};

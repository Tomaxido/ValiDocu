<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('document_field_specs', function (Blueprint $table) {
            $table->unsignedBigInteger('doc_type_id')->nullable();
        });

        // Poblar doc_type_id usando update
        DB::statement('
            UPDATE document_field_specs dfs
            SET doc_type_id = dt.id
            FROM document_types dt
            WHERE dfs.doc_type = dt.nombre_doc
        ');

        // Hacer doc_type_id no nullable y agregar la foreign key, luego eliminar doc_type
        Schema::table('document_field_specs', function (Blueprint $table) {
            $table->unsignedBigInteger('doc_type_id')->nullable(false)->change();
            $table->foreign('doc_type_id')->references('id')->on('document_types')->onDelete('cascade');
            $table->dropColumn('doc_type');

            $table->unique(['doc_type_id', 'field_key'], 'unique_doc_type_field_spec');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_field_specs', function (Blueprint $table) {
            //
        });
    }
};

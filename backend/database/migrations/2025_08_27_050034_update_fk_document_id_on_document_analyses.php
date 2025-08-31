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
        Schema::table('document_analyses', function (Blueprint $table) {
            // Primero eliminamos la FK actual (si existe)
            $table->dropForeign(['document_id']);

            // Luego la volvemos a crear con ON DELETE CASCADE
            $table->foreign('document_id')
                  ->references('id')
                  ->on('documents')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_analyses', function (Blueprint $table) {
            $table->dropForeign(['document_id']);
            $table->foreign('document_id')
                  ->references('id')
                  ->on('documents')
                  ->onDelete('restrict'); // estado anterior, ajusta según lo que tenías
        });
    }
};

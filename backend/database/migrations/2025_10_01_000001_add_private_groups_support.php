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
        // Agregar columnas para grupos privados
        Schema::table('document_groups', function (Blueprint $table) {
            $table->tinyInteger('is_private')->default(0)->comment('0=público, 1=privado')->after('status');
            $table->uuid('created_by')->nullable()->after('is_private');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // Agregar columna para permisos de edición en la tabla pivote users_groups
        Schema::table('users_groups', function (Blueprint $table) {
            $table->tinyInteger('can_edit')->default(0)->comment('0=solo lectura, 1=puede editar')->after('active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users_groups', function (Blueprint $table) {
            $table->dropColumn('can_edit');
        });

        Schema::table('document_groups', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropColumn(['is_private', 'created_by']);
        });
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Crear columna status_id (INT). Si tu PK es BIGINT, usa bigInteger en vez de integer.
        if (!Schema::hasColumn('analysis_issues', 'status_id')) {
            Schema::table('analysis_issues', function (Blueprint $table) {
                $table->integer('status_id')->nullable()->after('confidence');
            });
        }

        // 2) Borrar columna vieja 'status' (se pierden los datos)
        if (Schema::hasColumn('analysis_issues', 'status')) {
            Schema::table('analysis_issues', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }

        // 3) Agregar clave foránea a suggestion_status(id)
        Schema::table('analysis_issues', function (Blueprint $table) {
            $table->foreign('status_id')
                ->references('id')
                ->on('suggestion_status')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Quitar FK y columna status_id, y restaurar 'status' de texto
        Schema::table('analysis_issues', function (Blueprint $table) {
            $table->dropForeign(['status_id']);
            $table->dropColumn('status_id');
            $table->string('status')->nullable()->after('confidence');
        });
    }
};

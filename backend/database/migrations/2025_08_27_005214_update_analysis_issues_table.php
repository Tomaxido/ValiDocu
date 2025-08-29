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
        Schema::table('analysis_issues', function (Blueprint $table) {
            // 🔹 Eliminar columnas antiguas
            if (Schema::hasColumn('analysis_issues', 'field_key')) {
                $table->dropColumn('field_key');
            }
            if (Schema::hasColumn('analysis_issues', 'issue_type')) {
                $table->dropColumn('issue_type');
            }
            if (Schema::hasColumn('analysis_issues', 'message')) {
                $table->dropColumn('message');
            }
            if (Schema::hasColumn('analysis_issues', 'suggestion')) {
                $table->dropColumn('suggestion');
            }
            if (Schema::hasColumn('analysis_issues', 'confidence')) {
                $table->dropColumn('confidence');
            }
            if (Schema::hasColumn('analysis_issues', 'evidence')) {
                $table->dropColumn('evidence');
            }

            // 🔹 Nueva columna con FK
            $table->unsignedBigInteger('document_field_spec_id')->nullable()->after('document_analysis_id');

            $table->foreign('document_field_spec_id')
                ->references('id')
                ->on('document_field_specs')
                ->onDelete('cascade'); // opcional, si quieres que se eliminen issues al borrar el spec
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('analysis_issues', function (Blueprint $table) {
            // 🔹 Revertir: eliminar la foreign key y columna
            $table->dropForeign(['document_field_spec_id']);
            $table->dropColumn('document_field_spec_id');

            // 🔹 Volver a crear las columnas antiguas
            $table->string('field_key')->nullable();
            $table->string('issue_type')->nullable();
            $table->text('message')->nullable();
            $table->text('suggestion')->nullable();
            $table->float('confidence')->nullable();
            $table->json('evidence')->nullable();
        });
    }
};

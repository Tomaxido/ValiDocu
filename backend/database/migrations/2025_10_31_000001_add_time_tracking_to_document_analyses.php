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
            // Tiempo real de procesamiento de la IA (en segundos)
            $table->integer('processing_time_seconds')->nullable()->after('status')
                ->comment('Tiempo que tardó la IA en procesar el documento');
            
            // Estimado de tiempo manual (en segundos)
            $table->integer('manual_time_estimate_seconds')->nullable()->after('processing_time_seconds')
                ->comment('Estimado de tiempo que tomaría revisar manualmente');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_analyses', function (Blueprint $table) {
            $table->dropColumn(['processing_time_seconds', 'manual_time_estimate_seconds']);
        });
    }
};

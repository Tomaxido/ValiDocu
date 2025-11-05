<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique()->comment('Clave única del setting');
            $table->text('value')->comment('Valor del setting (JSON si es complejo)');
            $table->string('description')->nullable()->comment('Descripción del setting');
            $table->string('type')->default('string')->comment('Tipo: string, integer, json, boolean');
            $table->timestamps();
        });

        // Insertar configuraciones por defecto
        DB::table('system_settings')->insert([
            [
                'key' => 'manual_analysis_time_minutes',
                'value' => '60',
                'description' => 'Tiempo promedio estimado para análisis manual de documentos (en minutos)',
                'type' => 'integer',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'ai_analysis_time_minutes',
                'value' => '5',
                'description' => 'Tiempo promedio de análisis con IA (en minutos)',
                'type' => 'integer',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'dashboard_refresh_interval_seconds',
                'value' => '30',
                'description' => 'Intervalo de actualización del dashboard en segundos',
                'type' => 'integer',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};

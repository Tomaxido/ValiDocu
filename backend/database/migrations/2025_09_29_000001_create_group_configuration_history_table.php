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
        Schema::create('group_configuration_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id');
            $table->uuid('user_id');
            $table->enum('action', ['created', 'updated', 'deleted', 'initialized']);
            $table->json('old_configuration')->nullable();  // Configuración anterior
            $table->json('new_configuration')->nullable();  // Nueva configuración
            $table->json('summary')->nullable();             // Resumen de cambios
            $table->text('description')->nullable();         // Descripción del cambio
            $table->timestamps();

            // Índices para mejorar rendimiento
            $table->index('group_id');
            $table->index('user_id');
            $table->index('created_at');
            
            // Claves foráneas
            $table->foreign('group_id')->references('id')->on('document_groups')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_configuration_history');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration 9/9: Create document_audit_logs table
 * 
 * Purpose: Crear tabla de trazabilidad para mantener historial completo de acciones 
 * realizadas sobre documentos, incluyendo subida, descarga, eliminación, comentarios, 
 * re-subida, etc.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_audit_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            
            // Referencia al documento lógico (siempre presente)
            $table->unsignedBigInteger('document_id');
            
            // Referencia a la versión específica (opcional, para acciones que no están ligadas a una versión específica)
            $table->unsignedBigInteger('document_version_id')->nullable();
            
            // Acción realizada (enum de acciones específicas)
            $table->enum('action', [
                'uploaded',        // Documento subido por primera vez
                'downloaded',      // Documento descargado
                'deleted',         // Documento eliminado (soft delete)
                'reuploaded'       // Documento re-subido (nueva versión)
            ]);
            
            // Comentario o descripción adicional de la acción (opcional)
            $table->text('comment')->nullable();
            
            // Metadatos adicionales en formato JSON (opcional)
            // Puede incluir: IP, user agent, detalles específicos de la acción, etc.
            $table->json('metadata')->nullable();
            
            // Usuario que realizó la acción (nullable para acciones del sistema)
            $table->uuid('user_id')->nullable();
            
            // Dirección IP desde donde se realizó la acción
            $table->string('ip_address', 45)->nullable(); // 45 caracteres para IPv6
            
            // User Agent del navegador (para acciones web)
            $table->text('user_agent')->nullable();
            
            // Timestamps
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('document_id', 'fk_audit_document')
                  ->references('id')
                  ->on('documents')
                  ->onDelete('cascade'); // Si se elimina el documento, eliminar su historial
            
            $table->foreign('document_version_id', 'fk_audit_document_version')
                  ->references('id')
                  ->on('document_versions')
                  ->onDelete('set null'); // Si se elimina la versión, mantener el log pero sin referencia
            
            $table->foreign('user_id', 'fk_audit_user')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null'); // Si se elimina el usuario, mantener el log pero sin referencia
            
            // Indexes para mejorar rendimiento en consultas comunes
            $table->index('document_id', 'idx_audit_document');
            $table->index('document_version_id', 'idx_audit_version');
            $table->index('user_id', 'idx_audit_user');
            $table->index('action', 'idx_audit_action');
            $table->index('created_at', 'idx_audit_timestamp');
            
            // Índice compuesto para consultas de trazabilidad por documento
            $table->index(['document_id', 'created_at'], 'idx_audit_document_timeline');
            
            // Índice compuesto para consultas de actividad por usuario
            $table->index(['user_id', 'created_at'], 'idx_audit_user_activity');
        });
        
        echo "\n[INFO] document_audit_logs table created successfully\n";
        echo "[INFO] Esta tabla almacenará el historial completo de acciones sobre documentos\n";
        echo "[INFO] Incluye: subidas, descargas, eliminaciones, comentarios, cambios de estado, etc.\n";
    }

    public function down(): void
    {
        Schema::dropIfExists('document_audit_logs');
        
        echo "\n[ROLLBACK] document_audit_logs table dropped\n";
    }
};
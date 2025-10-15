<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Migration 7/8: Extend semantic_index with version and page
 * 
 * Purpose: Add version and page-level foreign keys to semantic_index.
 * Keeps legacy columns for compatibility while adding new relationships.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Add new columns (nullable)
        Schema::table('semantic_index', function (Blueprint $table) {
            $table->unsignedBigInteger('document_version_id')->nullable()->after('document_id');
            $table->unsignedBigInteger('document_page_id')->nullable()->after('document_version_id');

            // FK to document_versions (cascade delete)
            $table->foreign('document_version_id', 'fk_semidx_version')
                ->references('id')
                ->on('document_versions')
                ->onDelete('cascade');
            
            // FK to document_pages (cascade delete)
            $table->foreign('document_page_id', 'fk_semidx_page')
                ->references('id')
                ->on('document_pages')
                ->onDelete('cascade');

            $table->index('document_version_id', 'idx_semidx_version');
            $table->index('document_page_id', 'idx_semidx_page');
        });
    }

    public function down(): void
    {
        Schema::table('semantic_index', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex('idx_semidx_version');
            $table->dropIndex('idx_semidx_page');
            
            // Drop foreign keys
            $table->dropForeign('fk_semidx_version');
            $table->dropForeign('fk_semidx_page');
            
            // Drop columns
            $table->dropColumn(['document_version_id', 'document_page_id']);
        });
        
        echo "\n[ROLLBACK] Dropped document_version_id and document_page_id from semantic_index\n";
    }
};

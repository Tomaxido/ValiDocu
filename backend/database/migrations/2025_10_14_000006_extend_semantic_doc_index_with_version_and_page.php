<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up(): void
    {
        // Add document_version_id column (nullable)
        Schema::table('semantic_doc_index', function (Blueprint $table) {
            $table->unsignedBigInteger('document_version_id');
            $table->foreign('document_version_id', 'fk_semdocidx_version')
                ->references('id')
                ->on('document_versions')
                ->onDelete('cascade');

            // Add index for performance
            $table->index('document_version_id', 'idx_semdocidx_version');
            $table->dropForeign(['document_id']);
            $table->dropColumn('document_id');
        });
    }

    public function down(): void
    {
        // Re-add document_id column
        Schema::table('semantic_doc_index', function (Blueprint $table) {
            $table->unsignedBigInteger('document_id')->nullable()->after('id');
        });
        
        // Re-add foreign key for document_id
        Schema::table('semantic_doc_index', function (Blueprint $table) {
            $table->foreign('document_id')
                  ->references('id')
                  ->on('documents')
                  ->onDelete('cascade');
        });
        
        // Drop index, foreign key and column for document_version_id
        Schema::table('semantic_doc_index', function (Blueprint $table) {
            $table->dropIndex('idx_semdocidx_version');
            $table->dropForeign('fk_semdocidx_version');
            $table->dropColumn('document_version_id');
        });
        
        echo "\n[ROLLBACK] Reverted semantic_doc_index to use document_id\n";
    }
};

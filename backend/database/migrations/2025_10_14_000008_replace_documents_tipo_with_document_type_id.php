<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Migration 8/8: Replace documents.tipo with document_type_id
 * 
 * Purpose: Formalize document type relationship with proper foreign key to document_types table.
 * Replace legacy integer 'tipo' field with proper FK relationship.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Add document_type_id column (nullable)
        Schema::table('documents', function (Blueprint $table) {
            $table->unsignedBigInteger('document_type_id')->nullable();
        });
        
        // Add foreign key constraint
        Schema::table('documents', function (Blueprint $table) {
            $table->foreign('document_type_id', 'fk_docs_document_type')
                  ->references('id')
                  ->on('document_types')
                  ->onDelete('set null'); // Allow documents to exist without type

            // $table->dropColumn('tipo');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Re-add tipo column
            // $table->integer('tipo')->nullable()->default(0)->after('document_group_id');
        
            // Drop foreign key and document_type_id column
            $table->dropForeign('fk_docs_document_type');
            $table->dropColumn('document_type_id');
        });
    }
};

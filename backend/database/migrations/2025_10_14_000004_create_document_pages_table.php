<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_pages', function (Blueprint $table) {
            $table->bigIncrements('id');
            
            // Foreign key to document version
            $table->unsignedBigInteger('document_version_id');
            
            // Page identification
            $table->integer('page_number')->unsigned(); // Must be >= 1
            
            // Page-specific file data
            $table->string('image_path', 512)->nullable();
            
            // Page-level extracted data
            $table->jsonb('json_layout')->nullable();
            
            $table->timestamps();
            
            // Foreign key with cascade delete
            $table->foreign('document_version_id', 'fk_docpages_version')
                  ->references('id')
                  ->on('document_versions')
                  ->onDelete('cascade'); // Delete pages when version is deleted
            
            // Unique constraint: one record per version + page number
            $table->unique(['document_version_id', 'page_number'], 'uq_doc_pages_docver_page');
            
            // Performance indexes
            $table->index('document_version_id', 'idx_docpages_version');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_pages');
    }
};

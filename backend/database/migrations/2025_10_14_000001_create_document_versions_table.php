<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_versions', function (Blueprint $table) {
            $table->bigIncrements('id');
            
            // Foreign key to parent document (logical container)
            $table->unsignedBigInteger('document_id');
            
            // Version tracking
            $table->integer('version_number')->unsigned();
            
            // File metadata (moved from documents table)
            $table->string('filename', 255);
            $table->string('filepath', 512);
            $table->string('mime_type', 100)->nullable();
            $table->bigInteger('file_size')->unsigned()->nullable();
            
            // Document structure
            $table->integer('page_count')->default(1);
            
            // Business metadata (version-specific)
            $table->integer('due_date')->nullable()->default(0);
            $table->integer('normative_gap')->nullable()->default(0);
            
            // File integrity
            $table->string('checksum_sha256', 64)->nullable();
            
            // Audit trail
            $table->uuid('uploaded_by')->nullable();
            
            // Legacy support: will be deprecated after documents.current_version_id is added
            $table->boolean('is_current')->default(false);
            
            $table->timestamps();
            
            // Foreign key to documents with referential integrity (no null on delete)
            $table->foreign('document_id', 'fk_docver_document')
                  ->references('id')
                  ->on('documents')
                  ->onDelete('restrict'); // Cannot delete document if versions exist
            
            // Foreign key to users (nullable - may be system upload)
            $table->foreign('uploaded_by', 'fk_docver_uploaded_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            // Unique constraint: one version number per document
            $table->unique(['document_id', 'version_number'], 'uq_docver_doc_version');
            
            // Performance indexes
            $table->index('document_id', 'idx_docver_document');
            $table->index('version_number', 'idx_docver_version');
            $table->index('checksum_sha256', 'idx_docver_checksum');
            $table->index('is_current', 'idx_docver_current');
        });
        
        // Add partial unique index for checksum (prevents duplicate file uploads)
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('
                CREATE UNIQUE INDEX uq_docver_checksum_notnull 
                ON document_versions(checksum_sha256) 
                WHERE checksum_sha256 IS NOT NULL
            ');
        }
        
    }

    public function down(): void
    {
        Schema::dropIfExists('document_versions');
        
        echo "\n[ROLLBACK] document_versions table dropped\n";
    }
};

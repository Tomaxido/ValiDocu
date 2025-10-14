<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Add document_version_id column (nullable initially)
        Schema::table('document_analyses', function (Blueprint $table) {
            $table->unsignedBigInteger('document_version_id')->nullable()->after('id');
            $table->foreign('document_version_id', 'fk_docanalyses_version')
                  ->references('id')
                  ->on('document_versions')
                  ->onDelete('cascade'); // Delete analysis when version is deleted
        });
        
        // Step 2: Drop old document_id foreign key and column
        Schema::table('document_analyses', function (Blueprint $table) {
            // Drop existing foreign key first
            $table->dropForeign(['document_id']);
            $table->dropColumn('document_id');
        });
    }

    public function down(): void
    {
        // Step 1: Re-add document_id column (nullable)
        Schema::table('document_analyses', function (Blueprint $table) {
            $table->unsignedBigInteger('document_id')->nullable()->after('id');
        });
        
        // Step 2: Re-add foreign key for document_id
        Schema::table('document_analyses', function (Blueprint $table) {
            $table->foreign('document_id')
                  ->references('id')
                  ->on('documents')
                  ->onDelete('cascade');
        });
        
        // Step 3: Drop document_version_id foreign key and column
        Schema::table('document_analyses', function (Blueprint $table) {
            $table->dropForeign('fk_docanalyses_version');
            $table->dropColumn('document_version_id');
        });
    }
};

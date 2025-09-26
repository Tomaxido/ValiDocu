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
        Schema::table('document_field_specs', function (Blueprint $table) {
            // $table->foreign('doc_type')->references('nombre_doc')->on('document_types')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_field_specs', function (Blueprint $table) {
            // $table->dropForeign(['doc_type']);
        });
    }
};

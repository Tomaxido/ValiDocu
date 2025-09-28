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
        Schema::create('group_field_specs', function (Blueprint $table) {
            $table->integer('group_id');
            $table->integer('field_spec_id');
            $table->integer('document_type_id');

            $table->foreign('group_id')->references('id')->on('document_groups')->onDelete('cascade');
            $table->foreign('field_spec_id')->references('id')->on('document_field_specs')->onDelete('cascade');
            $table->foreign('document_type_id')->references('id')->on('document_types')->onDelete('cascade');

            $table->unique(['group_id', 'field_spec_id', 'document_type_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_field_specs');
    }
};

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
        Schema::create('users_groups', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id');
            $table->integer('group_id');
            $table->tinyInteger('active')->default(0)->comment('0=pendiente, 1=puede ver, 2=rechazado');
            $table->timestamps();
            $table->uuid('managed_by')->nullable();
            $table->foreign('managed_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('group_id')->references('id')->on('document_groups')->onDelete('cascade');
            
            // Evitar duplicados
            $table->unique(['user_id', 'group_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users_groups');
    }
};

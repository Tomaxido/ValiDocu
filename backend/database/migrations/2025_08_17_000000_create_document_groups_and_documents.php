<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Extensión vector (idempotente)
        DB::statement("CREATE EXTENSION IF NOT EXISTS vector");

        Schema::create('document_groups', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->integer('status')->default(0);
            $table->timestamps();
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('document_group_id');
            $table->string('filename');
            $table->string('filepath');
            $table->string('mime_type')->nullable();
            $table->integer('status')->default(0);
            $table->timestamps();

            $table->foreign('document_group_id')
                  ->references('id')->on('document_groups')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
        Schema::dropIfExists('document_groups');
        // No hacemos DROP EXTENSION para no romper otros objetos que la usen
    }
};

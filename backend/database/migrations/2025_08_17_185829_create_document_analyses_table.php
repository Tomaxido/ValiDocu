<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void {
        Schema::create('document_analyses', function (Blueprint $t) {
            $t->id();
            $t->foreignId('document_id')->constrained('documents');
            $t->string('status')->default('done');  // done|failed|running
            $t->text('summary')->nullable();
            $t->json('meta')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('document_analyses'); }

};

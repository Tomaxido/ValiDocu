<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void {
        Schema::create('document_field_specs', function (Blueprint $t) {
            $t->id();
            $t->string('doc_type');                 // p.ej. 'acuerdo', 'contrato'
            $t->string('field_key');                // p.ej. 'rut_emisor'
            $t->string('label');
            $t->boolean('is_required')->default(true);
            $t->string('datatype')->nullable();     // rut|date|money|integer|string|enum
            $t->string('regex')->nullable();
            $t->json('options')->nullable();        // rangos, enums, etc.
            $t->text('suggestion_template')->nullable();
            $t->text('example_text')->nullable();
            $t->timestamps();
            $t->unique(['doc_type','field_key']);
        });
        }
    
    public function down(): void { Schema::dropIfExists('document_field_specs'); }
};

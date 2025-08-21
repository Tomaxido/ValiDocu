<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends \Illuminate\Database\Migrations\Migration {
    public function up(): void {
        Schema::create('document_label_aliases', function (Blueprint $t) {
            $t->id();
            $t->string('doc_type')->nullable();
            $t->string('normalized_label');
            $t->string('field_key'); // rut_any, nombre_any, monto_total, etc.
            $t->unsignedInteger('priority')->default(100);
            $t->boolean('active')->default(true);
            $t->timestamps();
            $t->unique(['doc_type','normalized_label']);
            $t->index(['active','priority']);
        });
    }
    public function down(): void { Schema::dropIfExists('document_label_aliases'); }
};


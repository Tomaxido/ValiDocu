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
        Schema::create('analysis_issues', function (Blueprint $t) {
            $t->id();
            $t->foreignId('document_analysis_id')->constrained('document_analyses')->cascadeOnDelete();
            $t->string('field_key');                 // clave normalizada (p.ej. rut_emisor)
            $t->string('issue_type');               // MISSING|INCONSISTENT|FORMAT|OUTDATED
            $t->text('message');
            $t->text('suggestion')->nullable();
            $t->float('confidence')->nullable();    // 0..1
            $t->string('status')->default('TODO');  // TODO|NO_APLICA|RESUELTO
            $t->json('evidence')->nullable();       // {page,bboxes,label,raw_text}
            $t->timestamps();
            $t->index(['issue_type','status']);
        });
    }
    public function down(): void { Schema::dropIfExists('analysis_issues'); }

};

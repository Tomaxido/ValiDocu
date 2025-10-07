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
        Schema::create('group_access_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id');
            $table->uuid('requested_user_id'); // Usuario que se solicita agregar
            $table->uuid('requesting_user_id'); // Usuario que hace la solicitud (propietario del grupo)
            $table->tinyInteger('permission_type')->default(0)->comment('0=solo lectura, 1=edición');
            $table->tinyInteger('status')->default(0)->comment('0=pendiente, 1=aprobada, 2=rechazada');
            $table->uuid('reviewed_by')->nullable(); // Administrador que revisó la solicitud
            $table->timestamp('reviewed_at')->nullable();
            $table->text('request_reason')->nullable();
            $table->text('admin_comment')->nullable();
            $table->timestamps();

            $table->foreign('group_id')->references('id')->on('document_groups')->onDelete('cascade');
            $table->foreign('requested_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('requesting_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
            
            // Evitar solicitudes duplicadas para el mismo usuario en el mismo grupo
            $table->unique(['group_id', 'requested_user_id'], 'unique_group_user_request');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_access_requests');
    }
};
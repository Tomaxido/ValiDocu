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
        Schema::table('group_access_requests', function (Blueprint $table) {
            // Eliminar la restricción única para permitir múltiples solicitudes
            $table->dropUnique('unique_group_user_request');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('group_access_requests', function (Blueprint $table) {
            // Restaurar la restricción única
            $table->unique(['group_id', 'requested_user_id'], 'unique_group_user_request');
        });
    }
};
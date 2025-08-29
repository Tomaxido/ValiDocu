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
        Schema::table('analysis_issues', function (Blueprint $table) {
            // agrega la columna reason como ENUM
            $table->enum('reason', ['missing', 'invalid'])
                  ->default('missing');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('analysis_issues', function (Blueprint $table) {
            $table->dropColumn('reason');
        });
    }
};

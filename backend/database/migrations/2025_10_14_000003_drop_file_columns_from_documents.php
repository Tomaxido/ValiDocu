<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Drop file-related columns - data now lives in document_versions
            $table->dropColumn(['filename', 'filepath', 'mime_type', 'due_date', 'normative_gap']);
        });
    }

    public function down(): void
    {
        // Re-add columns as nullable (do NOT repopulate data)
        Schema::table('documents', function (Blueprint $table) {
            $table->string('filename', 255)->nullable()->after('document_group_id');
            $table->string('filepath', 512)->nullable()->after('filename');
            $table->string('mime_type', 100)->nullable()->after('filepath');
            $table->integer('due_date')->nullable()->default(0)->after('status');
            $table->integer('normative_gap')->nullable()->default(0)->after('due_date');
        });
    }
};

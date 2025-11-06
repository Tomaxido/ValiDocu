<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_comments', function (Blueprint $table) {
            $table->bigIncrements('id');

            // Foreign key to document version
            $table->unsignedBigInteger('document_version_id');

            // Foreign key to user (author of the comment)
            $table->uuid('user_id');

            // Comment content
            $table->text('comment');

            // Edit status
            // 0 = not edited (original)
            // 1 = edited
            $table->tinyInteger('is_edited')->default(0);

            // Audit trail
            $table->timestamps(); // created_at and updated_at
            $table->softDeletes(); // deleted_at for soft deletes (optional but recommended)

            // Foreign key to document_versions with referential integrity
            $table->foreign('document_version_id', 'fk_doccomm_docversion')
                  ->references('id')
                  ->on('document_versions')
                  ->onDelete('cascade'); // Delete comments when version is deleted

            // Foreign key to users
            $table->foreign('user_id', 'fk_doccomm_user')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade'); // Delete comments when user is deleted

            // Performance indexes
            $table->index('document_version_id', 'idx_doccomm_docversion');
            $table->index('user_id', 'idx_doccomm_user');
            $table->index('created_at', 'idx_doccomm_created');
            $table->index(['document_version_id', 'created_at'], 'idx_doccomm_docver_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_comments');

        echo "\n[ROLLBACK] document_comments table dropped\n";
    }
};

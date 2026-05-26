<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scanned_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('title', 255)->nullable();
            $table->string('original_filename', 255);
            $table->string('mime_type', 127);
            $table->bigInteger('file_size');
            $table->string('storage_path', 512);
            $table->text('ocr_text')->nullable();
            $table->string('ocr_status', 20)->default('pending');
            $table->integer('page_count')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->uuid('uploaded_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('cascade');
            $table->index('workspace_id');
            $table->index('ocr_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scanned_documents');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('email_id');
            $table->string('filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('storage_path');
            $table->timestamps();

            $table->foreign('email_id')->references('id')->on('emails')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_attachments');
    }
};

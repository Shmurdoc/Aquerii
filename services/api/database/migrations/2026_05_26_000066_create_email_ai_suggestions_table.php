<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_ai_suggestions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('email_id');
            $table->string('type'); // reply_draft|task_extract|summary
            $table->longText('content');
            $table->jsonb('extracted_tasks')->default('[]');
            $table->string('status')->default('pending'); // pending|approved|rejected
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('email_id')->references('id')->on('emails')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_ai_suggestions');
    }
};

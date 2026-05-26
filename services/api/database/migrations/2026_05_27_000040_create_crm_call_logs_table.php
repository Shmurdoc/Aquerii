<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_call_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('contact_id');
            $table->uuid('deal_id')->nullable();
            $table->uuid('user_id');
            $table->string('call_direction', 10)->default('outbound');
            $table->integer('duration_seconds')->nullable();
            $table->text('notes')->nullable();
            $table->string('call_outcome', 30)->nullable();
            $table->string('callee_phone', 50);
            $table->text('recording_url')->nullable();
            $table->timestampTz('called_at');
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('crm_contacts')->cascadeOnDelete();
            $table->foreign('deal_id')->references('id')->on('crm_deals')->nullOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('workspace_id');
            $table->index('contact_id');
            $table->index('user_id');
            $table->index('call_outcome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_call_logs');
    }
};

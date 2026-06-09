<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('contact_id')->nullable();
            $table->string('subject', 255);
            $table->text('description')->nullable();
            $table->string('status', 50)->default('open');
            $table->string('priority', 20)->default('normal');
            $table->string('channel', 50)->default('email');
            $table->uuid('assigned_to')->nullable();
            $table->uuid('sla_policy_id')->nullable();
            $table->timestampTz('sla_due_at')->nullable();
            $table->timestampTz('sla_breached_at')->nullable();
            $table->string('source', 100)->nullable();
            $table->jsonb('tags')->default('[]');
            $table->jsonb('custom_fields')->default('{}');
            $table->timestampTz('closed_at')->nullable();
            $table->text('resolution_summary')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('crm_contacts')->nullOnDelete();
            $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
            $table->foreign('sla_policy_id')->references('id')->on('support_ticket_slas')->nullOnDelete();
            $table->index('workspace_id');
            $table->index('status');
            $table->index('priority');
            $table->index('assigned_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};

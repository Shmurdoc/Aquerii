<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Project-specific email addresses (e.g., tasks@workspace.aquerii.app)
        Schema::create('project_email_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('address', 255); // e.g., tasks@inbound.aquerii.app
            $table->string('label', 100)->nullable(); // e.g., "Support Inbox"
            $table->string('target_board_id', 36)->nullable(); // auto-create tasks in this board
            $table->boolean('is_active')->default(true);
            $table->jsonb('settings')->default('{}'); // webhook provider, forwarding rules, etc.
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->unique(['workspace_id', 'address']);
            $table->index('address');
            $table->index('workspace_id');
        });

        // Inbound email records (raw email stored for audit)
        Schema::create('inbound_emails', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('project_email_address_id');
            $table->string('message_id', 500); // SMTP Message-ID
            $table->string('from_address', 255);
            $table->string('from_name', 255)->nullable();
            $table->text('to_addresses');
            $table->text('cc_addresses')->nullable();
            $table->string('subject', 500);
            $table->longText('body_text')->nullable();
            $table->longText('body_html')->nullable();
            $table->jsonb('headers')->default('{}');
            $table->jsonb('attachments_meta')->default('[]');
            $table->string('status', 50)->default('received'); // received, processed, failed
            $table->uuid('created_task_id')->nullable(); // if converted to task
            $table->text('processing_notes')->nullable();
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('project_email_address_id')->references('id')->on('project_email_addresses')->cascadeOnDelete();
            $table->index('workspace_id');
            $table->index('message_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inbound_emails');
        Schema::dropIfExists('project_email_addresses');
    }
};

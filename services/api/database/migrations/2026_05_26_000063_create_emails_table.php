<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('emails')) {
            return;
        }

        Schema::create('emails', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('email_account_id');
            $table->uuid('thread_id');
            $table->string('external_message_id')->nullable()->index();
            $table->string('direction'); // inbound|outbound
            $table->string('from_address');
            $table->string('from_name')->nullable();
            $table->jsonb('to_addresses')->default('[]');
            $table->jsonb('cc_addresses')->default('[]');
            $table->jsonb('bcc_addresses')->default('[]');
            $table->string('subject');
            $table->longText('body_html')->nullable();
            $table->longText('body_text')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('email_account_id')->references('id')->on('email_accounts')->cascadeOnDelete();
            $table->foreign('thread_id')->references('id')->on('email_threads')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emails');
    }
};

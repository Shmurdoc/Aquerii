<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_threads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('email_account_id');
            $table->string('subject');
            $table->string('external_thread_id')->nullable()->index();
            $table->string('status')->default('unread'); // unread|read|archived|snoozed
            $table->boolean('is_starred')->default(false);
            $table->timestamp('last_message_at')->nullable();
            $table->integer('message_count')->default(0);
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('email_account_id')->references('id')->on('email_accounts')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_threads');
    }
};

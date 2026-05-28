<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Chat channels (DMs and group channels)
        Schema::create('chat_channels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name', 255)->nullable();
            $table->string('type', 50)->default('dm'); // dm, group, channel
            $table->uuid('created_by')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_archived')->default(false);
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->index('workspace_id');
            $table->index('type');
        });

        // Channel participants
        Schema::create('chat_participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('channel_id');
            $table->uuid('user_id');
            $table->timestampTz('last_read_at')->nullable();
            $table->boolean('is_muted')->default(false);
            $table->timestampsTz();

            $table->foreign('channel_id')->references('id')->on('chat_channels')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['channel_id', 'user_id']);
            $table->index('channel_id');
            $table->index('user_id');
        });

        // Chat messages
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('channel_id');
            $table->uuid('user_id');
            $table->text('body');
            $table->jsonb('attachments')->default('[]');
            $table->uuid('reply_to')->nullable();
            $table->boolean('is_edited')->default(false);
            $table->boolean('is_deleted')->default(false);
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('channel_id')->references('id')->on('chat_channels')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('reply_to')->references('id')->on('chat_messages')->nullOnDelete();
            $table->index('channel_id');
            $table->index(['channel_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_participants');
        Schema::dropIfExists('chat_channels');
    }
};

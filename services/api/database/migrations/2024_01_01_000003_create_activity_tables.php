<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('entity_type', 50);
            $table->uuid('entity_id');
            $table->uuid('parent_id')->nullable();
            $table->jsonb('body');
            $table->uuid('created_by');
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->foreign('created_by')->references('id')->on('users');
            $table->index(['entity_type', 'entity_id']);
        });

        Schema::create('activity_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('entity_type', 50);
            $table->uuid('entity_id');
            $table->uuid('actor_id')->nullable();
            $table->string('action', 100);
            $table->jsonb('old_value')->nullable();
            $table->jsonb('new_value')->nullable();
            $table->jsonb('metadata')->default('{}');
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['entity_type', 'entity_id']);
            $table->index(['workspace_id', 'created_at']);
        });

        Schema::create('files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('entity_type', 50)->nullable();
            $table->uuid('entity_id')->nullable();
            $table->string('name', 500);
            $table->string('mime_type');
            $table->bigInteger('size_bytes');
            $table->text('storage_path');
            $table->text('thumbnail_url')->nullable();
            $table->uuid('uploaded_by');
            $table->timestampTz('created_at')->useCurrent();
            $table->softDeletesTz();
            $table->foreign('uploaded_by')->references('id')->on('users');
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->string('type', 100);
            $table->string('title', 500);
            $table->text('body')->nullable();
            $table->string('entity_type', 50)->nullable();
            $table->uuid('entity_id')->nullable();
            $table->timestampTz('read_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['user_id', 'read_at']);
        });

        Schema::create('realtime_events', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('event_id')->unique();
            $table->uuid('workspace_id');
            $table->string('room');
            $table->string('type', 100);
            $table->jsonb('payload');
            $table->uuid('actor_id')->nullable();
            $table->bigInteger('sequence');
            $table->timestampTz('occurred_at')->useCurrent();
            $table->index(['room', 'sequence']);
            $table->index('occurred_at');
        });

        Schema::create('billing_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id')->nullable();
            $table->string('processor', 20);
            $table->string('processor_event_id')->unique();
            $table->string('event_type', 100);
            $table->jsonb('payload');
            $table->timestampTz('processed_at')->useCurrent();
        });

        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('key');
            $table->string('payload_hash', 64);
            $table->jsonb('response');
            $table->smallInteger('status_code');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('expires_at');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['user_id', 'key']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
        Schema::dropIfExists('billing_events');
        Schema::dropIfExists('realtime_events');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('files');
        Schema::dropIfExists('activity_log');
        Schema::dropIfExists('comments');
    }
};

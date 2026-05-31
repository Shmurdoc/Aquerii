<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_webhook_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id')->nullable();
            $table->string('processor', 50); // stripe|payfast|...
            $table->string('processor_event_id', 191)->nullable();
            $table->string('event_type', 150);
            $table->jsonb('payload');
            $table->jsonb('headers')->nullable();
            $table->string('status', 20)->default('received'); // received|processed|failed|rejected|retrying
            $table->unsignedInteger('retry_count')->default(0);
            $table->timestampTz('next_retry_at')->nullable();
            $table->timestampTz('processed_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->nullOnDelete();

            $table->index(['workspace_id', 'status']);
            $table->index(['processor', 'processor_event_id']);
            $table->index(['status', 'next_retry_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_webhook_events');
    }
};

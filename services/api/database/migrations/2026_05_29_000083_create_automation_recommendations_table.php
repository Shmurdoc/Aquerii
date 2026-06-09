<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_recommendations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('category', 100)->nullable(); // task, workflow, crm, project
            $table->string('priority', 20)->default('medium'); // low, medium, high
            $table->jsonb('trigger_config')->default('{}');
            $table->jsonb('actions')->default('{}');
            $table->string('pattern_type', 100); // frequent_action, time_based, bottleneck, usage_pattern
            $table->jsonb('evidence')->default('{}'); // what patterns led to this recommendation
            $table->string('status', 50)->default('pending'); // pending, accepted, dismissed
            $table->uuid('automation_id')->nullable(); // if accepted, links to created automation
            $table->timestampTz('dismissed_at')->nullable();
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('automation_id')->references('id')->on('automations')->nullOnDelete();
            $table->index('workspace_id');
            $table->index('status');
            $table->index('pattern_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_recommendations');
    }
};

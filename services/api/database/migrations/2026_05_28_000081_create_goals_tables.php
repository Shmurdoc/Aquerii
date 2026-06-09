<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Goals (Objectives)
        Schema::create('goals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('timeframe', 50)->nullable(); // Q1 2024, H1 2024, etc.
            $table->string('status', 50)->default('active'); // active, completed, archived
            $table->uuid('owner_id')->nullable();
            $table->integer('position')->default(0);
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('owner_id')->references('id')->on('users')->nullOnDelete();
            $table->index('workspace_id');
            $table->index('status');
        });

        // Key Results
        Schema::create('key_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('goal_id');
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->decimal('target_value', 15, 2)->default(100);
            $table->decimal('current_value', 15, 2)->default(0);
            $table->string('unit', 50)->default('%'); // %, count, currency, etc.
            $table->string('status', 50)->default('on_track'); // on_track, at_risk, off_track, completed
            $table->uuid('owner_id')->nullable();
            $table->integer('position')->default(0);
            $table->timestampsTz();

            $table->foreign('goal_id')->references('id')->on('goals')->cascadeOnDelete();
            $table->foreign('owner_id')->references('id')->on('users')->nullOnDelete();
            $table->index('goal_id');
            $table->index('status');
        });

        // Meeting Outcomes
        Schema::create('meeting_outcomes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('meeting_id');
            $table->uuid('workspace_id');
            $table->jsonb('decisions')->default('[]');
            $table->jsonb('action_items')->default('[]'); // [{text, assignee_id, task_id}]
            $table->integer('effectiveness_score')->nullable(); // 1-5
            $table->text('notes')->nullable();
            $table->uuid('linked_goal_id')->nullable();
            $table->timestampsTz();

            $table->foreign('meeting_id')->references('id')->on('meetings')->cascadeOnDelete();
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('linked_goal_id')->references('id')->on('goals')->nullOnDelete();
            $table->index('meeting_id');
            $table->index('workspace_id');
            $table->unique('meeting_id'); // one outcome per meeting
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_outcomes');
        Schema::dropIfExists('key_results');
        Schema::dropIfExists('goals');
    }
};

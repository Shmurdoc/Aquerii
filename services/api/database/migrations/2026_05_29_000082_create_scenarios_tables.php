<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Project scenarios (snapshots of project state)
        Schema::create('scenarios', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('status', 50)->default('draft'); // draft, active, archived
            $table->boolean('is_baseline')->default(false); // current real state
            $table->jsonb('snapshot_data')->default('{}'); // full project state at snapshot time
            $table->jsonb('simulation_results')->nullable(); // projected outcomes
            $table->uuid('created_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->index('workspace_id');
            $table->index('status');
        });

        // What-if adjustments within a scenario
        Schema::create('scenario_adjustments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('scenario_id');
            $table->string('adjustment_type', 50); // add_delay, add_resource, remove_task, change_scope, change_deadline
            $table->jsonb('parameters')->default('{}'); // {task_id, days, resource_id, hours_per_week, etc.}
            $table->text('description')->nullable();
            $table->integer('position')->default(0);
            $table->timestampsTz();

            $table->foreign('scenario_id')->references('id')->on('scenarios')->cascadeOnDelete();
            $table->index('scenario_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scenario_adjustments');
        Schema::dropIfExists('scenarios');
    }
};

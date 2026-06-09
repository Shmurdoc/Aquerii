<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_activity_metrics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->date('date');

            // Work patterns
            $table->integer('active_hours')->default(0); // hours active in platform
            $table->integer('messages_sent')->default(0);
            $table->integer('messages_received')->default(0);
            $table->integer('avg_response_time_minutes')->nullable();

            // Task metrics
            $table->integer('tasks_assigned')->default(0);
            $table->integer('tasks_completed')->default(0);
            $table->integer('tasks_overdue')->default(0);
            $table->decimal('estimated_hours_total', 8, 2)->default(0);
            $table->decimal('tracked_hours_total', 8, 2)->default(0);

            // Sentiment
            $table->decimal('sentiment_score', 5, 2)->nullable(); // -1.0 to 1.0
            $table->integer('positive_messages')->default(0);
            $table->integer('negative_messages')->default(0);

            // Burnout indicators
            $table->integer('late_night_sessions')->default(0); // activity after 10pm
            $table->integer('weekend_sessions')->default(0);
            $table->boolean('flagged')->default(false);

            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['workspace_id', 'user_id', 'date']);
            $table->index('workspace_id');
            $table->index('date');
            $table->index('flagged');
        });

        Schema::create('burnout_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->decimal('score', 5, 2)->default(0); // 0-100, higher = more at risk
            $table->string('risk_level', 20)->default('low'); // low, medium, high, critical
            $table->jsonb('factors')->default('{}'); // breakdown of score factors
            $table->text('recommendations')->nullable();
            $table->timestampTz('calculated_at');
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['workspace_id', 'user_id']);
            $table->index('workspace_id');
            $table->index('risk_level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('burnout_scores');
        Schema::dropIfExists('team_activity_metrics');
    }
};

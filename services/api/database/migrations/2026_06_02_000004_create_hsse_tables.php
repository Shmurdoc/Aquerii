<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hsse_incidents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->string('reference', 30); // INC-2026-0001
            $table->string('title', 255);
            $table->text('description');
            $table->string('type', 50); // fatality, lost_time, medical_treatment, first_aid, property_damage, environmental, near_miss, other
            $table->string('severity', 20); // critical, high, medium, low, informational
            $table->string('status', 20)->default('open'); // open, under_investigation, closed, archived
            $table->timestamp('occurred_at');
            $table->timestamp('reported_at')->useCurrent();
            $table->string('location')->nullable();
            $table->jsonb('location_details')->nullable(); // {lat, lng, area, section, shaft, level}
            $table->string('body_part_affected')->nullable();
            $table->string('injury_type')->nullable();
            $table->string('mhsa_classification', 5)->nullable(); // A, B, C per MHS Act S.8
            $table->boolean('coida_reportable')->default(false);
            $table->string('coida_reference', 50)->nullable(); // W.Cl.2 number
            $table->uuid('reporter_id');
            $table->uuid('investigator_id')->nullable();
            $table->text('root_cause')->nullable();
            $table->text('immediate_cause')->nullable();
            $table->jsonb('contributing_factors')->nullable(); // array of strings
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('reporter_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('investigator_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['workspace_id', 'reference']);
            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'type']);
            $table->index(['workspace_id', 'severity']);
            $table->index(['workspace_id', 'occurred_at']);
        });

        Schema::create('hsse_hazards', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->string('reference', 30); // HAZ-2026-0001
            $table->string('title', 255);
            $table->text('description');
            $table->string('category', 50); // physical, chemical, biological, ergonomic, psychosocial, environmental, mechanical, electrical, other
            $table->string('location')->nullable();
            $table->text('source')->nullable(); // what creates the hazard
            $table->text('potential_consequence')->nullable();
            $table->unsignedSmallInteger('likelihood'); // 1-5
            $table->unsignedSmallInteger('severity'); // 1-5
            $table->unsignedSmallInteger('risk_score'); // likelihood * severity
            $table->string('risk_level', 20); // low, medium, high, extreme
            $table->jsonb('control_measures')->nullable(); // array of strings
            $table->unsignedSmallInteger('residual_likelihood')->nullable();
            $table->unsignedSmallInteger('residual_severity')->nullable();
            $table->unsignedSmallInteger('residual_risk_score')->nullable();
            $table->string('residual_risk_level', 20)->nullable();
            $table->string('status', 20)->default('identified'); // identified, assessed, controlled, monitored, closed
            $table->uuid('owner_id');
            $table->uuid('reviewer_id')->nullable();
            $table->date('next_review_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('owner_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('reviewer_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['workspace_id', 'reference']);
            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'category']);
            $table->index(['workspace_id', 'risk_level']);
        });

        Schema::create('hsse_corrective_actions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->string('reference', 30); // CA-2026-0001
            $table->string('source_type', 30); // incident, hazard, inspection, audit, observation, other
            $table->uuid('source_id')->nullable(); // polymorphic — no FK enforcement
            $table->text('description');
            $table->uuid('assigned_to');
            $table->string('priority', 20)->default('medium'); // low, medium, high, urgent
            $table->string('status', 20)->default('open'); // open, in_progress, completed, verified, overdue, cancelled
            $table->date('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->uuid('verified_by')->nullable();
            $table->text('completion_evidence')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('assigned_to')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();
            $table->unique(['workspace_id', 'reference']);
            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'source_type', 'source_id']);
            $table->index(['workspace_id', 'assigned_to']);
            $table->index(['workspace_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hsse_corrective_actions');
        Schema::dropIfExists('hsse_hazards');
        Schema::dropIfExists('hsse_incidents');
    }
};

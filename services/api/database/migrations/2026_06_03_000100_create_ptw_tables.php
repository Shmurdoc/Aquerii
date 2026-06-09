<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permits', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->string('reference', 30); // PTW-2026-0001
            $table->string('type', 30); // hot_work, confined_space, work_at_height, electrical_isolation, blasting, lifting, excavation
            $table->string('status', 25)->default('draft'); // draft, requested, approved, issued, active, suspended, closed, rejected, expired
            $table->string('title', 255);
            $table->text('description');
            $table->string('location', 255)->nullable();
            $table->jsonb('location_details')->nullable(); // {section, level, shaft, lat, lng}
            $table->string('equipment_id')->nullable(); // asset tag for the work target
            $table->uuid('issuer_id'); // person authorised to issue the permit
            $table->uuid('approver_id')->nullable(); // mine overseer / engineering for high-risk types
            $table->uuid('holder_id')->nullable(); // foreman responsible for the work
            $table->uuid('recipient_id')->nullable(); // team/contractor performing the work
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->integer('max_extension_minutes')->default(0);
            $table->integer('extensions_used_minutes')->default(0);
            $table->string('risk_level', 10)->nullable(); // low, medium, high, extreme
            $table->jsonb('pre_conditions')->nullable(); // array of checklist items, e.g. ["gas test < 1% LEL", "area barricaded"]
            $table->text('work_method_statement')->nullable();
            $table->text('ppe_required')->nullable();
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->uuid('closed_by')->nullable();
            $table->text('closure_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('suspension_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('issuer_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('approver_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('holder_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('recipient_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('closed_by')->references('id')->on('users')->restrictOnDelete();

            $table->unique(['workspace_id', 'reference']);
            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'type']);
            $table->index(['workspace_id', 'valid_until']);
            $table->index(['workspace_id', 'issuer_id']);
            $table->index(['workspace_id', 'holder_id']);
        });

        Schema::create('permit_hazards', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->uuid('permit_id');
            $table->uuid('hazard_id')->nullable(); // optional link to an existing HSSE hazard
            $table->string('description', 500);
            $table->string('control_measure', 500)->nullable();
            $table->string('residual_risk', 10)->default('low'); // low, medium, high
            $table->integer('sort_order')->default(0);
            $table->boolean('verified')->default(false);
            $table->uuid('verified_by')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('permit_id')->references('id')->on('permits')->cascadeOnDelete();
            $table->foreign('hazard_id')->references('id')->on('hsse_hazards')->nullOnDelete();
            $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['workspace_id', 'permit_id']);
        });

        Schema::create('permit_isolations', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->uuid('permit_id');
            $table->string('isolation_point', 255); // e.g. "Substation SS-12 incomer breaker"
            $table->string('energy_type', 30); // electrical, mechanical, hydraulic, pneumatic, thermal, chemical, gravitational, radioactive
            $table->string('method', 255)->nullable(); // LOTO procedure
            $table->string('lock_number', 100)->nullable();
            $table->string('tag_number', 100)->nullable();
            $table->uuid('applied_by')->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->uuid('removed_by')->nullable();
            $table->timestamp('removed_at')->nullable();
            $table->boolean('verified')->default(false);
            $table->uuid('verified_by')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('permit_id')->references('id')->on('permits')->cascadeOnDelete();
            $table->foreign('applied_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('removed_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['workspace_id', 'permit_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permit_isolations');
        Schema::dropIfExists('permit_hazards');
        Schema::dropIfExists('permits');
    }
};

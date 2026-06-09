<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_approval_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('threshold_min', 14, 2)->nullable();
            $table->decimal('threshold_max', 14, 2)->nullable();
            $table->string('approval_chain')->default('single');
            $table->jsonb('approvers');
            $table->unsignedInteger('escalation_hours')->nullable();
            $table->uuid('escalation_user_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_crm_app_rules_workspace ON crm_approval_rules (workspace_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_approval_rules');
    }
};

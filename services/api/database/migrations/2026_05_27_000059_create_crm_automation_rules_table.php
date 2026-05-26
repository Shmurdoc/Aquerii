<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_automation_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('trigger_type');
            $table->jsonb('trigger_config')->nullable();
            $table->jsonb('conditions')->nullable();
            $table->jsonb('actions');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('run_count')->default(0);
            $table->timestampTz('last_run_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_crm_auto_rules_workspace ON crm_automation_rules (workspace_id)');
        DB::statement('CREATE INDEX idx_crm_auto_rules_trigger ON crm_automation_rules (trigger_type)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_automation_rules');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_deal_approvals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('deal_id');
            $table->uuid('approval_rule_id')->nullable();
            $table->string('status')->default('pending');
            $table->uuid('current_approver_id')->nullable();
            $table->unsignedTinyInteger('step')->default(1);
            $table->jsonb('approval_log')->nullable();
            $table->timestampTz('escalated_at')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_crm_deal_app_deal ON crm_deal_approvals (deal_id)');
        DB::statement('CREATE INDEX idx_crm_deal_app_status ON crm_deal_approvals (status)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_deal_approvals');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_milestones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('crm_deal_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('due_date')->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestampTz('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('crm_deal_id')->references('id')->on('crm_deals')->cascadeOnDelete();
            $table->index(['workspace_id', 'crm_deal_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_milestones');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_contact_stage_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('contact_id');
            $table->string('from_stage', 30)->nullable();
            $table->string('to_stage', 30);
            $table->string('reason')->nullable();
            $table->uuid('changed_by')->nullable();
            $table->timestampTz('created_at');

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('crm_contacts')->cascadeOnDelete();
            $table->foreign('changed_by')->references('id')->on('users')->nullOnDelete();
            $table->index('contact_id');
            $table->index('to_stage');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_contact_stage_history');
    }
};

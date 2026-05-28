<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_folders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('parent_id')->nullable();
            $table->string('name');
            $table->string('icon', 50)->nullable();
            $table->float('position')->default(0);
            $table->uuid('created_by');
            $table->timestampsTz();
            $table->foreign('created_by')->references('id')->on('users');
        });

        // Self-referential FK added after table creation
        Schema::table('document_folders', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('document_folders')->nullOnDelete();
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('folder_id')->nullable();
            $table->uuid('linked_item_id')->nullable();
            $table->string('title', 500)->default('Untitled');
            $table->string('icon', 50)->nullable();
            $table->jsonb('content')->nullable();
            $table->binary('ydoc_state')->nullable();
            $table->integer('word_count')->default(0);
            $table->boolean('is_public')->default(false);
            $table->float('position')->default(0);
            $table->uuid('created_by');
            $table->uuid('updated_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->foreign('folder_id')->references('id')->on('document_folders')->nullOnDelete();
            $table->foreign('linked_item_id')->references('id')->on('items')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
        });

        // CRM
        Schema::create('crm_companies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->string('domain')->nullable();
            $table->text('logo_url')->nullable();
            $table->string('industry', 100)->nullable();
            $table->string('size', 50)->nullable();
            $table->string('country', 100)->nullable();
            $table->uuid('owner_id')->nullable();
            $table->jsonb('custom_fields')->default('{}');
            $table->uuid('created_by');
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('crm_contacts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('company_id')->nullable();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->text('avatar_url')->nullable();
            $table->string('job_title')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('country', 100)->nullable();
            $table->uuid('owner_id')->nullable();
            $table->jsonb('custom_fields')->default('{}');
            $table->uuid('created_by');
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->foreign('company_id')->references('id')->on('crm_companies')->nullOnDelete();
        });

        Schema::create('crm_pipelines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name')->default('Sales Pipeline');
            $table->boolean('is_default')->default(false);
            $table->timestampTz('created_at')->useCurrent();
        });

        Schema::create('crm_pipeline_stages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('pipeline_id');
            $table->string('name', 100);
            $table->string('color', 20)->nullable();
            $table->float('position')->default(0);
            $table->decimal('probability', 5, 2)->default(0);
            $table->boolean('is_won')->default(false);
            $table->boolean('is_lost')->default(false);
            $table->foreign('pipeline_id')->references('id')->on('crm_pipelines')->cascadeOnDelete();
        });

        Schema::create('crm_deals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('pipeline_id');
            $table->uuid('stage_id');
            $table->uuid('contact_id')->nullable();
            $table->uuid('company_id')->nullable();
            $table->string('title');
            $table->decimal('value', 15, 2)->nullable();
            $table->string('currency', 10)->default('USD');
            $table->uuid('owner_id')->nullable();
            $table->date('expected_close_date')->nullable();
            $table->integer('ai_score')->nullable();
            $table->jsonb('ai_score_reasoning')->nullable();
            $table->decimal('probability', 5, 2)->nullable();
            $table->text('lost_reason')->nullable();
            $table->jsonb('custom_fields')->default('{}');
            $table->uuid('created_by');
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->foreign('pipeline_id')->references('id')->on('crm_pipelines');
            $table->foreign('stage_id')->references('id')->on('crm_pipeline_stages');
            $table->foreign('contact_id')->references('id')->on('crm_contacts')->nullOnDelete();
            $table->foreign('company_id')->references('id')->on('crm_companies')->nullOnDelete();
        });

        // Automations
        Schema::create('automations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('board_id')->nullable();
            $table->string('name');
            $table->jsonb('trigger');
            $table->jsonb('filters')->default('[]');
            $table->jsonb('actions');
            $table->boolean('is_active')->default(true);
            $table->integer('run_count')->default(0);
            $table->timestampTz('last_run_at')->nullable();
            $table->uuid('created_by');
            $table->timestampsTz();
            $table->foreign('board_id')->references('id')->on('boards')->cascadeOnDelete();
        });

        Schema::create('automation_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('automation_id');
            $table->uuid('item_id')->nullable();
            $table->string('status', 50)->default('pending');
            $table->text('error_message')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->foreign('automation_id')->references('id')->on('automations')->cascadeOnDelete();
            $table->foreign('item_id')->references('id')->on('items')->nullOnDelete();
            $table->index(['automation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_runs');
        Schema::dropIfExists('automations');
        Schema::dropIfExists('crm_deals');
        Schema::dropIfExists('crm_pipeline_stages');
        Schema::dropIfExists('crm_pipelines');
        Schema::dropIfExists('crm_contacts');
        Schema::dropIfExists('crm_companies');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('document_folders');
    }
};

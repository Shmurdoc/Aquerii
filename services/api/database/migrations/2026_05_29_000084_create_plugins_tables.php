<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Plugin registry (marketplace)
        Schema::create('plugins', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug', 100)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('version', 50)->default('1.0.0');
            $table->string('author', 255)->nullable();
            $table->string('category', 100)->default('general');
            $table->string('icon_url', 500)->nullable();
            $table->string('repository_url', 500)->nullable();
            $table->jsonb('settings_schema')->default('{}'); // config fields the plugin needs
            $table->jsonb('hooks')->default('[]'); // what hooks this plugin listens to
            $table->boolean('is_active')->default(true);
            $table->boolean('is_official')->default(false);
            $table->integer('install_count')->default(0);
            $table->decimal('rating', 3, 2)->default(0);
            $table->timestampsTz();

            $table->index('category');
            $table->index('is_active');
        });

        // Workspace plugin installations
        Schema::create('plugin_installations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('plugin_id');
            $table->boolean('is_enabled')->default(true);
            $table->jsonb('settings')->default('{}'); // per-workspace config
            $table->timestampTz('installed_at');
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('plugin_id')->references('id')->on('plugins')->cascadeOnDelete();
            $table->unique(['workspace_id', 'plugin_id']);
            $table->index('workspace_id');
        });

        // Plugin hook executions (audit log)
        Schema::create('plugin_hook_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('installation_id');
            $table->string('hook_name', 100);
            $table->jsonb('payload')->default('{}');
            $table->jsonb('result')->nullable();
            $table->string('status', 50)->default('success'); // success, failed, skipped
            $table->text('error')->nullable();
            $table->integer('execution_ms')->nullable();
            $table->timestampsTz();

            $table->foreign('installation_id')->references('id')->on('plugin_installations')->cascadeOnDelete();
            $table->index('installation_id');
            $table->index('hook_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plugin_hook_logs');
        Schema::dropIfExists('plugin_installations');
        Schema::dropIfExists('plugins');
    }
};

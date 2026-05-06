<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Extensions are created in the PostgreSQL init SQL (01_schema.sql).
        // Migrations manage Laravel-level schema; raw DDL extensions are infra concerns.

        Schema::create('workspaces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug', 100)->unique();
            $table->text('logo_url')->nullable();
            $table->text('cover_url')->nullable();
            $table->string('custom_domain')->nullable()->unique();
            $table->string('timezone', 100)->default('UTC');
            $table->string('plan', 50)->default('free');
            $table->string('plan_status', 50)->default('active');
            $table->timestampTz('trial_ends_at')->nullable();
            $table->string('subscription_id_stripe')->nullable();
            $table->string('subscription_id_payfast')->nullable();
            $table->string('customer_id_stripe')->nullable();
            $table->integer('seat_count')->default(1);
            $table->integer('seat_quota')->default(5);
            $table->bigInteger('storage_quota_bytes')->default(524288000);
            $table->bigInteger('storage_used_bytes')->default(0);
            $table->integer('automations_quota')->default(50);
            $table->integer('automations_used')->default(0);
            $table->timestampTz('automations_reset_at')->nullable();
            $table->integer('ai_credits_quota')->default(100);
            $table->integer('ai_credits_used')->default(0);
            $table->timestampTz('ai_credits_reset_at')->nullable();
            $table->jsonb('settings')->default('{}');
            $table->uuid('owner_id')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestampTz('email_verified_at')->nullable();
            $table->string('password_hash')->nullable();
            $table->text('avatar_url')->nullable();
            $table->string('locale', 20)->default('en');
            $table->string('timezone', 100)->default('UTC');
            $table->string('two_factor_secret')->nullable();
            $table->boolean('two_factor_enabled')->default(false);
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestampTz('last_seen_at')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        // Add FK from workspaces.owner_id -> users.id now that users table exists
        Schema::table('workspaces', function (Blueprint $table) {
            $table->foreign('owner_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('oauth_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('provider', 50);
            $table->string('provider_id');
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('created_at');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['provider', 'provider_id']);
        });

        Schema::create('workspace_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->string('role', 50)->default('member');
            $table->string('status', 50)->default('active');
            $table->uuid('invited_by')->nullable();
            $table->string('invite_token')->nullable();
            $table->timestampTz('joined_at')->nullable();
            $table->timestampTz('created_at');
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['workspace_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_members');
        Schema::dropIfExists('oauth_accounts');
        Schema::dropIfExists('users');
        Schema::dropIfExists('workspaces');
    }
};

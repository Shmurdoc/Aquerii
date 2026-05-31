<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── crm_companies: billing/subscription fields ───────────────────────
        Schema::table('crm_companies', function (Blueprint $table) {
            if (! Schema::hasColumn('crm_companies', 'subscription_plan')) {
                $table->string('subscription_plan', 50)->default('free')->after('owner_id');
            }
            if (! Schema::hasColumn('crm_companies', 'billing_email')) {
                $table->string('billing_email', 255)->nullable()->after('subscription_plan');
            }
            if (! Schema::hasColumn('crm_companies', 'billing_address')) {
                $table->text('billing_address')->nullable()->after('billing_email');
            }
            if (! Schema::hasColumn('crm_companies', 'tax_id')) {
                $table->string('tax_id', 50)->nullable()->after('billing_address');
            }
            if (! Schema::hasColumn('crm_companies', 'employee_count')) {
                $table->unsignedInteger('employee_count')->default(0)->after('tax_id');
            }
            if (! Schema::hasColumn('crm_companies', 'auto_invoice')) {
                $table->boolean('auto_invoice')->default(false)->after('employee_count');
            }

            // Add FK on owner_id if not set
            $fkName = 'crm_companies_owner_id_foreign';
            $fkExists = collect(DB::select('SELECT conname FROM pg_constraint WHERE conname = ?', [$fkName]))->isNotEmpty();
            if (! $fkExists && Schema::hasColumn('crm_companies', 'owner_id')) {
                $table->foreign('owner_id', $fkName)->references('id')->on('users')->nullOnDelete();
            }
        });

        // ─── workspace_members: company link + soft deletes ───────────────────
        Schema::table('workspace_members', function (Blueprint $table) {
            if (! Schema::hasColumn('workspace_members', 'company_id')) {
                $table->uuid('company_id')->nullable()->after('reports_to');
                $table->foreign('company_id', 'wm_company_id_foreign')
                    ->references('id')->on('crm_companies')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('workspace_members', 'is_company_owner')) {
                $table->boolean('is_company_owner')->default(false)->after('company_id');
            }
            if (! Schema::hasColumn('workspace_members', 'deleted_at')) {
                $table->softDeletesTz('deleted_at')->after('updated_at');
            }
        });

        // ─── employee_groups: soft deletes ────────────────────────────────────
        Schema::table('employee_groups', function (Blueprint $table) {
            if (! Schema::hasColumn('employee_groups', 'deleted_at')) {
                $table->softDeletesTz('deleted_at')->after('updated_at');
            }
        });

        // ─── admin_audit_log (append-only, no RLS) ────────────────────────────
        if (! Schema::hasTable('admin_audit_log')) {
            Schema::create('admin_audit_log', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('admin_user_id');
                $table->string('action', 100);
                $table->string('entity_type', 100)->nullable();
                $table->uuid('entity_id')->nullable();
                $table->jsonb('before_data')->nullable();
                $table->jsonb('after_data')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestampTz('created_at')->default(DB::raw('NOW()'));

                $table->index(['admin_user_id', 'action']);
                $table->index('entity_type');
                $table->index('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_log');

        Schema::table('employee_groups', function (Blueprint $table) {
            $table->dropColumn('deleted_at');
        });

        Schema::table('workspace_members', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn(['company_id', 'is_company_owner', 'deleted_at']);
        });

        Schema::table('crm_companies', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn(['subscription_plan', 'billing_email', 'billing_address', 'tax_id', 'employee_count', 'auto_invoice']);
        });
    }
};

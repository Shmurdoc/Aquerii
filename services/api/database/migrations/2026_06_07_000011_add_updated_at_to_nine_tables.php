<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Nine tables were created with only created_at but no updated_at, which
 * breaks Laravel's timestamp convention ($model->save() / update() writes
 * updated_at on every persist). Adding the column to all of them.
 */
return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'oauth_accounts',
            'activity_log',
            'admin_audit_log',
            'audit_logs',
            'automation_runs',
            'crm_contact_stage_history',
            'files',
            'idempotency_keys',
            'notifications',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, 'updated_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->timestampTz('updated_at')->nullable()->default(now());
                });
            }
        }
    }

    public function down(): void
    {
        $tables = [
            'oauth_accounts', 'activity_log', 'admin_audit_log', 'audit_logs',
            'automation_runs', 'crm_contact_stage_history', 'files',
            'idempotency_keys', 'notifications',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'updated_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropColumn('updated_at');
                });
            }
        }
    }
};

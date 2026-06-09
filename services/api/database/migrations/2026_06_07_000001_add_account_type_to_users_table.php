<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Adds the account_type column to the users table as a CHECK-constrained
 * VARCHAR (Postgres enums-as-varchar convention used elsewhere in this
 * project: cheap to ALTER, easy to add values to, indexable).
 *
 * Values: 'superadmin_creator', 'platform_admin', 'subscriber', 'employee'
 * Default: 'employee' — backfills all existing users in a single ALTER.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users ADD COLUMN account_type VARCHAR(32) NOT NULL DEFAULT 'employee' CHECK (account_type IN ('superadmin_creator', 'platform_admin', 'subscriber', 'employee'))");
        DB::statement('CREATE INDEX users_account_type_idx ON users (account_type)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS users_account_type_idx');
        DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS account_type');
    }
};

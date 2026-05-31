<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds invited_email to workspace_members so pending invites can be
 * created before the invited user registers an account.
 *
 * Also makes user_id nullable (a pending invite has no user_id until accepted).
 */
return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL cannot alter a column referenced by an RLS policy.
        // Drop the policy, change the column, then recreate the policy.
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_own_workspaces ON workspace_members');

        // Ensure the SECURITY DEFINER helper exists (idempotent).
        // Use OR REPLACE so we don't need CASCADE (policies depend on it).
        DB::unprepared('CREATE SCHEMA IF NOT EXISTS auth');
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION auth.current_user_workspace_ids()
            RETURNS TABLE (workspace_id uuid)
            LANGUAGE sql
            STABLE
            SECURITY DEFINER
            AS $$
                SELECT wm.workspace_id FROM workspace_members wm
                WHERE wm.user_id = current_setting('app.current_user_id', true)::uuid
                  AND wm.status = 'active'
            $$;
        SQL);

        Schema::table('workspace_members', function (Blueprint $table) {
            // Allow null user_id for pre-registration invites
            $table->uuid('user_id')->nullable()->change();
            // Store the invited email for pending invites
            $table->string('invited_email')->nullable()->after('user_id');
            // Add index for fast lookup by token
            $table->index('invite_token');
        });

        // Drop any pre-existing policies before recreating (may exist from
        // earlier migrations in a fresh migrate).
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_insert ON workspace_members');
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_own_workspaces ON workspace_members');
        DB::unprepared(
            'CREATE POLICY workspace_members_own_workspaces ON workspace_members FOR SELECT
             USING (workspace_id IN (SELECT auth.current_user_workspace_ids()))'
        );

        DB::unprepared(
            "CREATE POLICY workspace_members_insert ON workspace_members FOR INSERT
             WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL)"
        );
    }

    public function down(): void
    {
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_insert ON workspace_members');
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_own_workspaces ON workspace_members');

        Schema::table('workspace_members', function (Blueprint $table) {
            $table->uuid('user_id')->nullable(false)->change();
            $table->dropColumn('invited_email');
            $table->dropIndex(['invite_token']);
        });

        DB::unprepared('DROP POLICY IF EXISTS workspace_members_insert ON workspace_members');
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_own_workspaces ON workspace_members');
        DB::unprepared(
            'CREATE POLICY workspace_members_own_workspaces ON workspace_members FOR SELECT
             USING (workspace_id IN (SELECT auth.current_user_workspace_ids()))'
        );

        DB::unprepared(
            "CREATE POLICY workspace_members_insert ON workspace_members FOR INSERT
             WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL)"
        );
    }
};

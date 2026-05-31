<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add Row Level Security (RLS) policies to tables that were missing them.
 *
 * Tables covered:
 *   - users            : user can only see their own row
 *   - workspace_members: user can only see members of workspaces they belong to
 *   - oauth_accounts   : user can only see their own OAuth accounts
 *   - realtime_events  : user can only see events for their workspace
 *   - billing_events   : user can only see billing events for their workspace
 *
 * The superadmin role (aquerii_superadmin) has BYPASSRLS set at the role level
 * so it is not subject to these policies.
 */
return new class extends Migration
{
    public function up(): void
    {
        // SECURITY DEFINER helper to break the self-referencing RLS recursion.
        // The policy on workspace_members needs to query workspace_members, which
        // would normally trigger RLS again (infinite recursion). This function
        // runs with SECURITY DEFINER. Since aquerii_app is the table owner and
        // FORCE ROW LEVEL SECURITY is NOT set (see below), the table owner
        // is exempt from RLS, so the inner query avoids recursion.
        DB::unprepared('CREATE SCHEMA IF NOT EXISTS auth');
        DB::unprepared('DROP FUNCTION IF EXISTS auth.current_user_workspace_ids()');
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

        // ── users ────────────────────────────────────────────────────────────
        DB::statement('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
        DB::statement('ALTER TABLE users FORCE ROW LEVEL SECURITY');

        // Users can read and update their own row only
        DB::statement(<<<'SQL'
            CREATE POLICY users_self_rw ON users
            USING (id = current_setting('app.current_user_id', true)::uuid)
            WITH CHECK (id = current_setting('app.current_user_id', true)::uuid)
        SQL);

        // ── workspace_members ────────────────────────────────────────────────
        DB::statement('ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY');
        // NOTE: FORCE ROW LEVEL SECURITY is intentionally omitted on
        // workspace_members because the SECURITY DEFINER function
        // (auth.current_user_workspace_ids()) is owned by aquerii_app, which
        // is also the table owner. With FORCE, the owner is subject to RLS,
        // causing infinite recursion. Without FORCE, the function's inner
        // query bypasses RLS. A future refactor should separate the table
        // owner role from the application role so FORCE can be re-enabled.

        // Users can see members of workspaces they themselves belong to.
        // Uses SECURITY DEFINER function to avoid infinite recursion.
        // FOR SELECT only — the separate workspace_members_insert policy
        // handles INSERT so the USING clause (which acts as WITH CHECK on
        // INSERT for FOR ALL policies) doesn't create a chicken-and-egg.
        DB::statement(<<<'SQL'
            CREATE POLICY workspace_members_own_workspaces ON workspace_members FOR SELECT
            USING (
                workspace_id IN (SELECT auth.current_user_workspace_ids())
            )
        SQL);

        // Separate INSERT policy: any authenticated user can add members.
        // Without this, the USING clause acts as the implicit WITH CHECK,
        // creating a chicken-and-egg problem (you can't add a member who
        // isn't already a member).  The policy checks that the caller has
        // a valid session (app.current_user_id is set).
        DB::statement(<<<'SQL'
            CREATE POLICY workspace_members_insert ON workspace_members FOR INSERT
            WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL)
        SQL);

        // ── oauth_accounts ───────────────────────────────────────────────────
        DB::statement('ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY');
        DB::statement('ALTER TABLE oauth_accounts FORCE ROW LEVEL SECURITY');

        DB::statement(<<<'SQL'
            CREATE POLICY oauth_accounts_self ON oauth_accounts
            USING (user_id = current_setting('app.current_user_id', true)::uuid)
            WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid)
        SQL);

        // ── realtime_events ──────────────────────────────────────────────────
        DB::statement('ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY');
        DB::statement('ALTER TABLE realtime_events FORCE ROW LEVEL SECURITY');

        DB::statement(<<<'SQL'
            CREATE POLICY realtime_events_workspace ON realtime_events
            USING (
                workspace_id = current_setting('app.current_workspace_id', true)::uuid
            )
        SQL);

        // ── billing_events ───────────────────────────────────────────────────
        DB::statement('ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY');
        DB::statement('ALTER TABLE billing_events FORCE ROW LEVEL SECURITY');

        DB::statement(<<<'SQL'
            CREATE POLICY billing_events_workspace ON billing_events
            USING (
                workspace_id = current_setting('app.current_workspace_id', true)::uuid
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS users_self_rw ON users');
        DB::statement('ALTER TABLE users DISABLE ROW LEVEL SECURITY');

        DB::statement('DROP POLICY IF EXISTS workspace_members_own_workspaces ON workspace_members');
        DB::statement('ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY');

        DB::statement('DROP POLICY IF EXISTS oauth_accounts_self ON oauth_accounts');
        DB::statement('ALTER TABLE oauth_accounts DISABLE ROW LEVEL SECURITY');

        DB::statement('DROP POLICY IF EXISTS realtime_events_workspace ON realtime_events');
        DB::statement('ALTER TABLE realtime_events DISABLE ROW LEVEL SECURITY');

        DB::statement('DROP POLICY IF EXISTS billing_events_workspace ON billing_events');
        DB::statement('ALTER TABLE billing_events DISABLE ROW LEVEL SECURITY');
    }
};

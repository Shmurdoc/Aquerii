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
        DB::statement('ALTER TABLE workspace_members FORCE ROW LEVEL SECURITY');

        // Users can see members of workspaces they themselves belong to
        DB::statement(<<<'SQL'
            CREATE POLICY workspace_members_own_workspaces ON workspace_members
            USING (
                workspace_id IN (
                    SELECT workspace_id FROM workspace_members
                    WHERE user_id = current_setting('app.current_user_id', true)::uuid
                      AND status = 'active'
                )
            )
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

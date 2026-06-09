<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fix RLS infinite recursion on workspace_members.
 *
 * The workspace_members_own_workspaces policy on workspace_members
 * self-referenced the same table in its USING clause:
 *
 *   WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE ...)
 *
 * PostgreSQL detects this recursion when validating FK constraints
 * (e.g., employee_groups.manager_id -> workspace_members.id).
 *
 * This migration replaces the self-referencing policy with one that
 * uses a SECURITY DEFINER function (auth.current_user_workspace_ids()),
 * which queries workspace_members without triggering RLS.
 */
return new class extends Migration
{
    public function up(): void
    {
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

        // Drop the self-referencing policy if it still exists.
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_own_workspaces ON workspace_members');

        // Recreate it using the SECURITY DEFINER function.
        // FOR SELECT only — the separate INSERT policy below handles inserts
        // so the USING clause doesn't block adding the first workspace member.
        DB::unprepared(
            'CREATE POLICY workspace_members_own_workspaces ON workspace_members FOR SELECT
             USING (workspace_id IN (SELECT auth.current_user_workspace_ids()))'
        );

        // Add a separate INSERT policy so the USING clause (which acts as an
        // implicit WITH CHECK) doesn't prevent adding the first member.
        // Guard with DROP IF EXISTS because earlier migrations may have
        // already created this policy.
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_insert ON workspace_members');
        DB::unprepared(
            "CREATE POLICY workspace_members_insert ON workspace_members FOR INSERT
             WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL)"
        );
    }

    public function down(): void
    {
        // Rollback: restore the original self-referencing policy (supports migrate:rollback).
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_insert ON workspace_members');
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_own_workspaces ON workspace_members');

        DB::unprepared(
            "CREATE POLICY workspace_members_own_workspaces ON workspace_members FOR SELECT
             USING (workspace_id IN (
                 SELECT workspace_id FROM workspace_members
                 WHERE user_id = current_setting('app.current_user_id', true)::uuid
                   AND status = 'active'
             ))"
        );

        DB::unprepared(
            "CREATE POLICY workspace_members_insert ON workspace_members FOR INSERT
             WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL)"
        );

        DB::unprepared('DROP FUNCTION IF EXISTS auth.current_user_workspace_ids()');
    }
};

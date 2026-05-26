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

        Schema::table('workspace_members', function (Blueprint $table) {
            // Allow null user_id for pre-registration invites
            $table->uuid('user_id')->nullable()->change();
            // Store the invited email for pending invites
            $table->string('invited_email')->nullable()->after('user_id');
            // Add index for fast lookup by token
            $table->index('invite_token');
        });

        DB::unprepared(
            "CREATE POLICY workspace_members_own_workspaces ON workspace_members
             USING (workspace_id IN (
                 SELECT workspace_id FROM workspace_members
                 WHERE user_id = current_setting('app.current_user_id', true)::uuid
                   AND status = 'active'
             ))"
        );
    }

    public function down(): void
    {
        DB::unprepared('DROP POLICY IF EXISTS workspace_members_own_workspaces ON workspace_members');

        Schema::table('workspace_members', function (Blueprint $table) {
            $table->uuid('user_id')->nullable(false)->change();
            $table->dropColumn('invited_email');
            $table->dropIndex(['invite_token']);
        });

        DB::unprepared(
            "CREATE POLICY workspace_members_own_workspaces ON workspace_members
             USING (workspace_id IN (
                 SELECT workspace_id FROM workspace_members
                 WHERE user_id = current_setting('app.current_user_id', true)::uuid
                   AND status = 'active'
             ))"
        );
    }
};

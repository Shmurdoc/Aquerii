<?php

namespace App\Console\Commands;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EnsureTestUser extends Command
{
    protected $signature = 'test:user
        {--email=test@example.com : Email for the test user (idempotent key)}
        {--password=password123 : Password to set (rewritten on every run)}
        {--name=Test User : Display name}
        {--workspace=Test Workspace : Workspace name (per-owner idempotent key)}';

    protected $description = 'Idempotently create/restore the Playwright E2E test user, workspace, and owner membership.';

    public function handle(): int
    {
        $email = (string) $this->option('email');
        $password = (string) $this->option('password');
        $name = (string) $this->option('name');
        $workspaceName = (string) $this->option('workspace');

        return DB::transaction(function () use ($email, $password, $name, $workspaceName) {
            $user = User::withTrashed()->firstOrNew(['email' => $email]);
            $user->name = $name;
            $user->password_hash = Hash::make($password);
            if ($user->trashed()) {
                $user->restore();
            }
            $user->save();

            $workspace = Workspace::withTrashed()->firstOrNew([
                'name' => $workspaceName,
                'owner_id' => $user->id,
            ]);
            if (! $workspace->exists) {
                $workspace->slug = $this->uniqueSlug($workspaceName, $user->id);
            }
            if ($workspace->trashed()) {
                $workspace->restore();
            }
            $workspace->save();

            $member = WorkspaceMember::withTrashed()->firstOrNew([
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
            ]);
            $member->role = 'owner';
            $member->status = 'active';
            $member->joined_at = $member->joined_at ?? now();
            if ($member->trashed()) {
                $member->restore();
            }
            $member->save();

            $this->info('Test user ready:');
            $this->line("  user_id      = {$user->id}");
            $this->line("  email        = {$user->email}");
            $this->line("  workspace_id = {$workspace->id}");
            $this->line("  workspace    = {$workspace->name} ({$workspace->slug})");
            $this->line("  member_id    = {$member->id}");
            $this->line("  role         = {$member->role}");

            return self::SUCCESS;
        });
    }

    private function uniqueSlug(string $name, string $userId): string
    {
        $base = Str::slug($name) ?: 'workspace';
        if (! Workspace::withTrashed()->where('slug', $base)->exists()) {
            return $base;
        }
        $suffixed = $base.'-'.substr(str_replace('-', '', $userId), 0, 8);
        if (! Workspace::withTrashed()->where('slug', $suffixed)->exists()) {
            return $suffixed;
        }

        return $base.'-'.Str::random(6);
    }
}

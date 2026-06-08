<?php

namespace App\Console\Commands;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CleanupTestData extends Command
{
    /**
     * Patterns are intentionally narrow. The test user pattern is the exact
     * timestamped form used by the E2E seeder (`test-{unix_ts}@example.com`).
     * The test workspace pattern is the exact name 'Test Workspace'.
     *
     * Protected (NEVER touched):
     *   - any email ending in @pilot.example.com
     *   - any email ending in @aquerii.co.za
     */
    private const TEST_USER_EMAIL_REGEX = '/^test-\d+@example\.com$/';

    private const TEST_WORKSPACE_NAME = 'Test Workspace';

    private const STALE_DAYS = 30;

    private const PROTECTED_EMAIL_SUFFIXES = [
        '@pilot.example.com',
        '@aquerii.co.za',
    ];

    protected $signature = 'cleanup:test-data
        {--dry-run : List candidates only (default; safe mode)}
        {--execute : Soft-delete candidates (prompts for confirmation)}
        {--yes : Skip confirmation prompt}
        {--include-recent : Bypass the 30-day inactivity filter on Test Workspaces}';

    protected $description = 'Find and soft-delete stale test data (timestamped test users and unused Test Workspaces)';

    public function handle(): int
    {
        $execute = (bool) $this->option('execute');
        $yes = (bool) $this->option('yes');
        $includeRecent = (bool) $this->option('include-recent');

        $this->newLine();
        $this->info('╔══════════════════════════════════════════════════════════╗');
        $this->info('║     Aquerii — Test Data Cleanup                         ║');
        $this->info('╚══════════════════════════════════════════════════════════╝');
        $this->newLine();
        $this->line(sprintf('  Mode:          %s', $execute ? 'EXECUTE (will soft-delete)' : 'DRY-RUN (read-only)'));
        $this->line(sprintf('  DB:            %s@%s:%s/%s', config('database.connections.pgsql.username'), config('database.connections.pgsql.host'), config('database.connections.pgsql.port'), config('database.connections.pgsql.database')));
        $this->line(sprintf('  Test pattern:  email ~ /^test-\d+@example\.com$/'));
        $this->line(sprintf('  Workspace:     name = %s AND stale >= %dd', "'".self::TEST_WORKSPACE_NAME."'", self::STALE_DAYS));
        $this->line(sprintf('  Include recent:%s', $includeRecent ? ' YES (bypassing 30d filter)' : ' no'));
        $this->newLine();

        $users = $this->findTestUsers();
        $workspaces = $this->findTestWorkspaces($includeRecent);

        // Defensive: filter out any protected emails (shouldn't match, but be safe)
        $safeUsers = array_values(array_filter($users, fn ($u) => ! $this->isProtectedEmail($u->email)));
        $blocked = count($users) - count($safeUsers);
        if ($blocked > 0) {
            $this->warn("  WARNING: {$blocked} candidate(s) matched the test pattern but were filtered out as protected emails.");
        }

        $this->renderUsers($safeUsers);
        $this->renderWorkspaces($workspaces);
        $this->newLine();
        $this->line(sprintf('  Summary: %d test user(s), %d test workspace(es) match.', count($safeUsers), count($workspaces)));
        $this->newLine();

        if (! $execute) {
            $this->info('  ℹ  Dry-run only. Re-run with --execute to soft-delete.');

            return self::SUCCESS;
        }

        if (count($safeUsers) === 0 && count($workspaces) === 0) {
            $this->info('  Nothing to clean. Done.');

            return self::SUCCESS;
        }

        if (! $yes) {
            $answer = $this->ask(sprintf('  Soft-delete %d user(s) and %d workspace(s)?', count($safeUsers), count($workspaces)), 'no');
            if (! preg_match('/^y(es)?$/i', trim((string) $answer))) {
                $this->info('  Aborted.');

                return self::SUCCESS;
            }
        }

        return $this->executeDeletes($safeUsers, $workspaces);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, User>
     */
    private function findTestUsers()
    {
        $regex = self::TEST_USER_EMAIL_REGEX;

        return User::query()
            ->whereNull('deleted_at')
            ->whereRaw('email ~ ?', [$regex])
            ->orderBy('created_at')
            ->get(['id', 'name', 'email', 'created_at', 'updated_at', 'last_seen_at']);
    }

    /**
     * @return Collection<int, object>
     */
    private function findTestWorkspaces(bool $includeRecent)
    {
        $staleDays = self::STALE_DAYS;

        $query = DB::table('workspaces as w')
            ->leftJoin('workspace_members as wm', 'wm.workspace_id', '=', 'w.id')
            ->whereNull('w.deleted_at')
            ->where('w.name', self::TEST_WORKSPACE_NAME)
            ->groupBy('w.id', 'w.name', 'w.slug', 'w.created_at', 'w.updated_at')
            ->orderBy('w.created_at')
            ->select(
                'w.id',
                'w.name',
                'w.slug',
                'w.created_at',
                'w.updated_at',
                DB::raw('MAX(wm.joined_at) as member_last_seen'),
                DB::raw(sprintf(
                    'GREATEST(w.updated_at, COALESCE(MAX(wm.joined_at), w.created_at)) AS last_activity_at'
                )),
            );

        if (! $includeRecent) {
            $query->havingRaw(
                "GREATEST(w.updated_at, COALESCE(MAX(wm.joined_at), w.created_at)) < (NOW() - (? || ' days')::interval)",
                [(string) $staleDays]
            )->orHavingNull('w.updated_at');
        }

        return $query->get();
    }

    private function renderUsers($users): void
    {
        $this->newLine();
        $this->line(sprintf('─── Test users (test-{n}@example.com) (%d) ───', count($users)));
        if ($users->isEmpty()) {
            $this->line('  (none)');

            return;
        }
        foreach ($users as $u) {
            $lastSeen = $u->last_seen_at ? $this->fmtDate($u->last_seen_at) : '(never)';
            $this->line(sprintf('  • id=%s | %s <%s> | created=%s | last_seen=%s', $u->id, $u->name, $u->email, $this->fmtDate($u->created_at), $lastSeen));
        }
    }

    private function renderWorkspaces($workspaces): void
    {
        $this->newLine();
        $this->line(sprintf("─── Test workspaces (name='%s', stale >= %dd) (%d) ───", self::TEST_WORKSPACE_NAME, self::STALE_DAYS, count($workspaces)));
        if ($workspaces->isEmpty()) {
            $this->line('  (none)');

            return;
        }
        foreach ($workspaces as $w) {
            $lastActivity = $this->fmtDate($w->last_activity_at);
            $daysIdle = $w->last_activity_at
                ? (int) floor((time() - strtotime($w->last_activity_at)) / 86400)
                : '?';
            $this->line(sprintf('  • id=%s | slug=%s | created=%s | last_activity=%s | days_idle=%s', $w->id, $w->slug ?? '(no slug)', $this->fmtDate($w->created_at), $lastActivity, $daysIdle));
        }
    }

    private function executeDeletes($users, $workspaces): int
    {
        $t0 = microtime(true);
        $now = now();

        $userCount = 0;
        $wsCount = 0;

        if (count($users) > 0) {
            $ids = $users->pluck('id')->all();
            $userCount = User::query()
                ->whereIn('id', $ids)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
            $this->info("  ✓ Soft-deleted {$userCount} user(s)");
        }

        if (count($workspaces) > 0) {
            $ids = $workspaces->pluck('id')->all();
            $wsCount = DB::table('workspaces')
                ->whereIn('id', $ids)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
            $this->info("  ✓ Soft-deleted {$wsCount} workspace(s)");
        }

        $elapsed = number_format(microtime(true) - $t0, 2);
        $this->line("  Done in {$elapsed}s.");

        return self::SUCCESS;
    }

    private function isProtectedEmail(string $email): bool
    {
        $lower = strtolower($email);
        foreach (self::PROTECTED_EMAIL_SUFFIXES as $suffix) {
            if (str_ends_with($lower, $suffix)) {
                return true;
            }
        }

        return false;
    }

    private function fmtDate($d): string
    {
        if (! $d) {
            return '(never)';
        }
        if ($d instanceof \DateTimeInterface) {
            return $d->format('Y-m-d H:i:sO');
        }

        return (string) $d;
    }
}

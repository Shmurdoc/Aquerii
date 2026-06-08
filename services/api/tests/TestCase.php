<?php

namespace Tests;

use App\Core\Models\User;
use Closure;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase {
        refreshDatabase as protected baseRefreshDatabase;
    }

    private ?Closure $userCreatingCallback = null;

    protected function setUp(): void
    {
        parent::setUp();

        // FORCE ROW LEVEL SECURITY is enabled on users with a WITH CHECK policy
        // requiring id = current_setting('app.current_user_id').  Test factories
        // insert users without an active HTTP request, so the middleware never
        // sets this variable — causing every factory->create() to fail.
        //
        // We register a creating listener that sets the session variable to the
        // new user's UUID before the INSERT runs.  The listener is cleaned up in
        // tearDown() to avoid listener accumulation across tests.
        $this->userCreatingCallback = function ($user) {
            if (DB::getDriverName() === 'pgsql' && $user->id) {
                DB::select("SELECT set_config('app.current_user_id', ?, true)", [(string) $user->id]);
            }
        };
        User::creating($this->userCreatingCallback);

        // Clear file cache between tests to prevent rate-limit state and
        // idempotency keys from leaking between test runs.
        try {
            Cache::flush();
        } catch (\UnexpectedValueException $e) {
            // Cache directory may not have subdirectories yet (e.g. CI)
        }

        // Reset any statically-cached auth guard user (e.g. from Sanctum::actingAs)
        // so it does not bleed into subsequent requests within the same test.
        Auth::forgetGuards();
    }

    protected function tearDown(): void
    {
        if ($this->userCreatingCallback) {
            // Flush registered model event listeners to avoid accumulating
            // anonymous creating callbacks across tests in the same process.
            User::flushEventListeners();
            // HasUuids is registered via static::creating during boot(),
            // which already ran.  Flushing listeners doesn't remove the
            // trait's observer — on the NEXT test setUp(), HasUuids will
            // fire before our new listener because boot() ran at class load.
        }

        // Reset the PostgreSQL RLS session variable so a stale value from
        // the previous test (or a session-level SET in seeders) does not
        // leak into the next test's connection.  The setUp() callback uses
        // set_config(..., true) which is transaction-scoped, but the
        // session-level value persists across the transaction rollback.
        if (DB::getDriverName() === 'pgsql') {
            try {
                DB::statement('RESET app.current_user_id');
            } catch (\Throwable $e) {
                // ignore if connection cannot accept RESET (e.g. closed)
            }
        }

        parent::tearDown();
    }

    /**
     * Override refreshDatabase to pass --force so migrate:fresh never prompts.
     */
    protected function refreshDatabase()
    {
        $this->beforeRefreshingDatabase();

        if ($this->usingInMemoryDatabase()) {
            $this->restoreInMemoryDatabase();
        }

        $this->refreshTestDatabase();

        $this->afterRefreshingDatabase();
    }

    /**
     * Use --force to avoid Mockery issues with ConfirmableTrait.
     */
    protected function refreshTestDatabase()
    {
        if (! RefreshDatabaseState::$migrated) {
            $this->artisan('migrate:fresh', array_merge(
                $this->migrateFreshUsing(),
                ['--force' => true, '--seed' => false]
            ));

            $this->app[Kernel::class]->setArtisan(null);

            RefreshDatabaseState::$migrated = true;
        }

        $this->beginDatabaseTransaction();
    }
}

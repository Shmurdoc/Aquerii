<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase {
        refreshDatabase as protected baseRefreshDatabase;
    }

    protected function setUp(): void
    {
        parent::setUp();

        // Clear file cache between tests to prevent rate-limit state and
        // idempotency keys from leaking between test runs.
        Cache::flush();

        // Reset any statically-cached auth guard user (e.g. from Sanctum::actingAs)
        // so it does not bleed into subsequent requests within the same test.
        Auth::forgetGuards();
    }

    protected function tearDown(): void
    {
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

<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;

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
}

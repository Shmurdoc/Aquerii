<?php

use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Tests\TestCase;

/*
 * The test database (aquerii_test) is pre-migrated via the fix_test_db.sh
 * helper script or manually before running tests.  Setting $migrated = true
 * here prevents the RefreshDatabase trait from calling migrate:fresh within
 * the test, which avoids deadlock issues on PostgreSQL when multiple database
 * connections are open simultaneously.
 *
 * If you need to rebuild the test schema from scratch, run:
 *   docker exec -e DB_DATABASE=aquerii_test aquerii-api-1 php artisan migrate:fresh --force
 */
RefreshDatabaseState::$migrated = true;

uses(TestCase::class)
    ->beforeEach(function () {
        config(['scout.queue' => false]);
    })
    ->in('Feature', 'Unit');

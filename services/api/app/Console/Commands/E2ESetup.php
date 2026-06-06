<?php

namespace App\Console\Commands;

use Database\Seeders\E2ESeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class E2ESetup extends Command
{
    protected $signature = 'e2e:setup
        {--migrate : Run database migrations (default: yes) - skip with --no-migrate}
        {--fresh : Drop all tables and re-migrate (destructive)}';

    protected $description = 'Idempotent E2E test data setup: applies migrations and runs E2ESeeder (re-runnable after migrate:fresh).';

    public function handle(): int
    {
        $this->newLine();
        $this->info('╔══════════════════════════════════════════════════════════╗');
        $this->info('║     Aquerii — E2E Test Data Setup                       ║');
        $this->info('╚══════════════════════════════════════════════════════════╝');
        $this->newLine();

        $this->line(sprintf('  DB:     %s@%s:%s/%s',
            config('database.connections.pgsql.username'),
            config('database.connections.pgsql.host'),
            config('database.connections.pgsql.port'),
            config('database.connections.pgsql.database'),
        ));
        $this->line(sprintf('  APP_ENV: %s', app()->environment()));
        $this->newLine();

        $runMigrate = $this->input->hasOption('migrate') || ! $this->option('no-migrate');
        $runMigrate = $this->input->getOption('migrate') !== false && $this->option('migrate') !== false;
        $fresh = (bool) $this->option('fresh');

        if ($runMigrate) {
            $cmd = $fresh ? 'migrate:fresh' : 'migrate';
            $args = ['--force' => true];
            $this->info("  → php artisan {$cmd} --force");
            $exit = Artisan::call($cmd, $args);
            $this->line(Artisan::output());
            if ($exit !== 0) {
                $this->error("  ✗ Migration failed (exit {$exit})");
                return self::FAILURE;
            }
        } else {
            $this->line('  → skip migrations (--no-migrate)');
        }

        $this->info('  → php artisan db:seed --class=E2ESeeder --force');
        $exit = Artisan::call('db:seed', [
            '--class' => E2ESeeder::class,
            '--force' => true,
        ]);
        $this->line(Artisan::output());
        if ($exit !== 0) {
            $this->error("  ✗ E2ESeeder failed (exit {$exit})");
            return self::FAILURE;
        }

        $this->newLine();
        $this->info('  ✓ E2E test data ready (test@example.com / password123)');
        $this->newLine();
        return self::SUCCESS;
    }
}

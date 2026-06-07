<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SuperAdminSeeder::class,
            AutomationLibrarySeeder::class,
            ChartOfAccountsSeeder::class,
            FeaturesSeeder::class,
            IndustryTemplateSeeder::class,
            RolePermissionSeeder::class,
            DepartmentSeeder::class,
            // E2ESeeder is fully idempotent (firstOrCreate everywhere), so it's
            // safe to run in any environment. Running it ensures the e2e test
            // user (test@example.com) and pilot workspace exist after
            // `migrate:fresh --seed` without needing a separate `e2e:setup` step.
            E2ESeeder::class,
        ]);
    }
}

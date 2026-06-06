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
        ]);

        if (app()->environment('testing')) {
            $this->call(E2ESeeder::class);
        }
    }
}

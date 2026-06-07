<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('SUPER_ADMIN_EMAIL');
        $password = env('SUPER_ADMIN_PASSWORD');

        if (! $email || ! $password) {
            if (app()->environment('production')) {
                // Hard fail in real production — a missing superadmin is a
                // genuine misconfiguration that must be fixed before launch.
                throw new \RuntimeException(
                    'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in production. '.
                    'Refusing to seed super admin with default credentials.'
                );
            }

            $this->command->warn('SuperAdminSeeder skipped: SUPER_ADMIN_EMAIL/PASSWORD not set (non-production env).');

            return;
        }

        $existing = DB::table('users')->where('email', $email)->first();

        if ($existing) {
            $this->command->info("Super admin already exists: {$email}");

            return;
        }

        $userId = (string) Str::uuid();

        DB::statement("SET app.current_user_id = '{$userId}'");

        DB::table('users')->insert([
            'id' => $userId,
            'name' => 'Super Admin',
            'email' => $email,
            'email_verified_at' => now(),
            'password_hash' => Hash::make($password),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Grant the user super-admin role on platform_admins (matches migration schema)
        DB::table('platform_admins')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'level' => 'super',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::statement('RESET app.current_user_id');

        $this->command->info("Super admin created: {$email}");
    }
}

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
        $email    = env('SUPER_ADMIN_EMAIL', 'superadmin@aquerii.local');
        $password = env('SUPER_ADMIN_PASSWORD', 'changeme_in_production');

        $existing = DB::table('users')->where('email', $email)->first();

        if ($existing) {
            $this->command->info("Super admin already exists: {$email}");
            return;
        }

        DB::table('users')->insert([
            'id'                => (string) Str::uuid(),
            'name'              => 'Super Admin',
            'email'             => $email,
            'email_verified_at' => now(),
            'password_hash'     => Hash::make($password),
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $this->command->info("Super admin created: {$email}");
    }
}

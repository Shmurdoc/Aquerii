<?php

namespace Database\Factories;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password_hash' => bcrypt('password'),
            'email_verified_at' => now(),
            'locale' => 'en',
            'timezone' => 'UTC',
        ];
    }
}

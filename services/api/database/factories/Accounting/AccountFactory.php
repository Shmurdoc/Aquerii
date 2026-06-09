<?php

namespace Database\Factories\Accounting;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\Accounting\Models\Account;
use Illuminate\Database\Eloquent\Factories\Factory;

class AccountFactory extends Factory
{
    protected $model = Account::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'code' => fake()->unique()->numerify('####'),
            'name' => fake()->words(2, true),
            'type' => fake()->randomElement(['asset', 'liability', 'equity', 'income', 'expense']),
            'description' => fake()->sentence(),
            'is_active' => true,
            'created_by' => User::factory(),
        ];
    }
}

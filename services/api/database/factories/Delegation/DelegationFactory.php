<?php

namespace Database\Factories\Delegation;

use App\Core\Models\Item;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\Delegation\Models\Delegation;
use Illuminate\Database\Eloquent\Factories\Factory;

class DelegationFactory extends Factory
{
    protected $model = Delegation::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'item_id' => Item::factory(),
            'from_user_id' => User::factory(),
            'to_user_id' => User::factory(),
            'reason' => fake()->sentence(),
            'status' => 'active',
            'delegated_at' => now(),
        ];
    }
}

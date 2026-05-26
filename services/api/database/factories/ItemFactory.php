<?php

namespace Database\Factories;

use App\Core\Models\Board;
use App\Core\Models\BoardGroup;
use App\Core\Models\Item;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        return [
            'board_id' => Board::factory(),
            'group_id' => BoardGroup::factory(),
            'workspace_id' => Workspace::factory(),
            'title' => fake()->sentence(4),
            'position' => 65536.0,
            'status' => null,
            'priority' => null,
            'column_values' => [],
            'version' => 1,
            'created_by' => User::factory(),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Board;
use App\Models\BoardGroup;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class ItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'board_id'     => Board::factory(),
            'group_id'     => BoardGroup::factory(),
            'workspace_id' => Workspace::factory(),
            'title'        => fake()->sentence(4),
            'position'     => 65536.0,
            'status'       => null,
            'priority'     => null,
            'column_values'=> [],
            'version'      => 1,
            'created_by'   => User::factory(),
        ];
    }
}

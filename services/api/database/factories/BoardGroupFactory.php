<?php

namespace Database\Factories;

use App\Models\Board;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class BoardGroupFactory extends Factory
{
    public function definition(): array
    {
        return [
            'board_id'     => Board::factory(),
            'workspace_id' => Workspace::factory(),
            'name'         => 'Default Group',
            'color'        => '#6366f1',
            'collapsed'    => false,
            'position'     => 65536.0,
        ];
    }
}

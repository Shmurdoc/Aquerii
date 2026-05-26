<?php

namespace Database\Factories;

use App\Core\Models\Board;
use App\Core\Models\BoardGroup;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class BoardGroupFactory extends Factory
{
    protected $model = BoardGroup::class;

    public function definition(): array
    {
        return [
            'board_id' => Board::factory(),
            'workspace_id' => Workspace::factory(),
            'name' => 'Default Group',
            'color' => '#6366f1',
            'collapsed' => false,
            'position' => 65536.0,
        ];
    }
}

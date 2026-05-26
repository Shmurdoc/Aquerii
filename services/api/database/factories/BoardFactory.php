<?php

namespace Database\Factories;

use App\Core\Models\Board;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class BoardFactory extends Factory
{
    protected $model = Board::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'name' => implode(' ', fake()->words(3)).' Board',
            'type' => 'main',
            'default_view' => 'kanban',
            'settings' => [],
            'position' => 65536.0,
            'created_by' => User::factory(),
        ];
    }
}

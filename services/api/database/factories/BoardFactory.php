<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class BoardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'name'         => implode(' ', fake()->words(3)) . ' Board',
            'type'         => 'main',
            'default_view' => 'kanban',
            'settings'     => [],
            'position'     => 65536.0,
            'created_by'   => User::factory(),
        ];
    }
}

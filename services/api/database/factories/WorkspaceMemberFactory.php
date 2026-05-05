<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkspaceMemberFactory extends Factory
{
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'user_id'      => User::factory(),
            'role'         => 'member',
            'status'       => 'active',
            'joined_at'    => now(),
            'created_at'   => now(),
        ];
    }
}

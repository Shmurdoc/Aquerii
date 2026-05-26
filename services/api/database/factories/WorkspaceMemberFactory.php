<?php

namespace Database\Factories;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkspaceMemberFactory extends Factory
{
    protected $model = WorkspaceMember::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'user_id' => User::factory(),
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
            'created_at' => now(),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Core\Models\Shift;
use App\Core\Models\ShiftAssignment;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShiftAssignmentFactory extends Factory
{
    protected $model = ShiftAssignment::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'shift_id' => Shift::factory(),
            'user_id' => User::factory(),
            'date' => fake()->dateTimeBetween('-1 week', '+2 weeks')->format('Y-m-d'),
            'status' => 'scheduled',
        ];
    }
}

<?php

namespace Database\Factories;

use App\Core\Models\Shift;
use App\Core\Models\ShiftAssignment;
use App\Core\Models\ShiftHandover;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShiftHandoverFactory extends Factory
{
    protected $model = ShiftHandover::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'departing_user_id' => User::factory(),
            'incoming_user_id' => User::factory(),
            'departing_notes' => fake()->paragraph(),
            'status' => 'pending',
            'departing_signed_at' => now(),
        ];
    }
}

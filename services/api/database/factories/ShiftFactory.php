<?php

namespace Database\Factories;

use App\Core\Models\Shift;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShiftFactory extends Factory
{
    protected $model = Shift::class;

    public function definition(): array
    {
        $shifts = [
            ['Day Shift', '06:00', '14:00', 8, 'day', '#4CAF50'],
            ['Night Shift', '22:00', '06:00', 8, 'night', '#2196F3'],
            ['Afternoon Shift', '14:00', '22:00', 8, 'custom', '#FF9800'],
        ];
        $pick = fake()->randomElement($shifts);

        return [
            'workspace_id' => Workspace::factory(),
            'name' => $pick[0],
            'start_time' => $pick[1],
            'end_time' => $pick[2],
            'duration_hours' => $pick[3],
            'type' => $pick[4],
            'color' => $pick[5],
            'is_active' => true,
        ];
    }
}

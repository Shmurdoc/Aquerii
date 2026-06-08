<?php

namespace Database\Factories\Equipment;

use App\Core\Models\Workspace;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\MaintenanceSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

class MaintenanceScheduleFactory extends Factory
{
    protected $model = MaintenanceSchedule::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'equipment_id' => Equipment::factory(),
            'name' => fake()->randomElement(['250hr Service', 'Annual Inspection', 'Oil Change', 'Filter Replacement']),
            'frequency_type' => fake()->randomElement(['hours', 'days', 'months']),
            'frequency_value' => fake()->randomElement([250, 500, 30, 90, 365]),
            'trigger_type' => fake()->randomElement(['meter', 'calendar']),
            'is_active' => true,
        ];
    }
}

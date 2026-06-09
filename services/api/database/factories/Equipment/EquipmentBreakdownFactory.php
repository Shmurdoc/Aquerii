<?php

namespace Database\Factories\Equipment;

use App\Core\Models\Workspace;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentBreakdown;
use Illuminate\Database\Eloquent\Factories\Factory;

class EquipmentBreakdownFactory extends Factory
{
    protected $model = EquipmentBreakdown::class;

    public function definition(): array
    {
        $statuses = ['reported', 'in_progress', 'resolved', 'closed'];

        return [
            'workspace_id' => Workspace::factory(),
            'equipment_id' => Equipment::factory(),
            'description' => fake()->sentence(),
            'root_cause' => fake()->optional()->sentence(),
            'action_taken' => fake()->optional()->sentence(),
            'downtime_minutes' => fake()->optional()->numberBetween(30, 1440),
            'status' => fake()->randomElement($statuses),
            'reported_at' => now(),
            'resolved_at' => null,
        ];
    }
}

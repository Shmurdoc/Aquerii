<?php

namespace Database\Factories\Equipment;

use App\Core\Models\Workspace;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class EquipmentFactory extends Factory
{
    protected $model = Equipment::class;

    public function definition(): array
    {
        $statuses = ['operational', 'standby', 'breakdown', 'decommissioned'];

        return [
            'workspace_id' => Workspace::factory(),
            'category_id' => EquipmentCategory::factory(),
            'plant_number' => strtoupper(fake()->randomLetter()).'-'.fake()->unique()->numberBetween(1, 9999),
            'name' => fake()->words(2, true),
            'make' => fake()->company(),
            'model' => fake()->bothify('Model-####'),
            'serial_number' => fake()->unique()->bothify('SN-########'),
            'year' => fake()->year(),
            'location' => fake()->word().' Section',
            'status' => fake()->randomElement($statuses),
            'purchase_date' => fake()->dateTimeBetween('-5 years', 'now'),
            'purchase_cost' => fake()->randomFloat(2, 1000, 500000),
            'warranty_expiry' => fake()->dateTimeBetween('now', '+3 years'),
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function operational(): static
    {
        return $this->state(fn () => ['status' => 'operational']);
    }

    public function breakdown(): static
    {
        return $this->state(fn () => ['status' => 'breakdown']);
    }
}

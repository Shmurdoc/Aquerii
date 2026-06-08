<?php

namespace Database\Factories\Core;

use App\Core\Models\Equipment;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class EquipmentFactory extends Factory
{
    protected $model = Equipment::class;

    public function definition(): array
    {
        $types = ['drill_rig', 'lhd', 'conveyor', 'pump', 'vehicle', 'generator', 'compressor', 'crane', 'other'];
        $statuses = ['active', 'inactive', 'scrapped'];
        $complianceStatuses = ['compliant', 'inspection_due', 'cert_expiring', 'non_compliant', 'suspended'];

        return [
            'workspace_id' => Workspace::factory(),
            'name' => fake()->words(2, true),
            'equipment_type' => fake()->randomElement($types),
            'registration_number' => strtoupper(fake()->randomLetter()).'-'.fake()->unique()->numberBetween(1000, 99999),
            'manufacturer' => fake()->company(),
            'model' => fake()->bothify('Model-####'),
            'year' => fake()->numberBetween(2000, 2026),
            'site_area' => 'Section '.fake()->numberBetween(1, 10).' Level '.fake()->numberBetween(1, 5),
            'status' => fake()->randomElement($statuses),
            'compliance_status' => fake()->randomElement($complianceStatuses),
            'last_compliance_check_at' => fake()->optional(0.8)->dateTimeBetween('-6 months', 'now'),
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function compliant(): static
    {
        return $this->state(fn () => [
            'compliance_status' => 'compliant',
            'last_compliance_check_at' => fake()->dateTimeBetween('-1 month', 'now'),
        ]);
    }

    public function nonCompliant(): static
    {
        return $this->state(fn () => [
            'compliance_status' => 'non_compliant',
        ]);
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => 'active']);
    }
}

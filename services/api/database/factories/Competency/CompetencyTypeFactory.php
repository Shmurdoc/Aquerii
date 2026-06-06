<?php

namespace Database\Factories\Competency;

use App\Modules\Competency\Models\CompetencyType;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompetencyTypeFactory extends Factory
{
    protected $model = CompetencyType::class;

    public function definition(): array
    {
        $names = ['Blasting License', 'Shift Supervisor Ticket', 'Dump Truck Operation', 'LHD Operation', 'Risk Assessment', 'First Aid Level 1', 'Fire Fighting', 'Confined Space Entry'];

        return [
            'workspace_id' => Workspace::factory(),
            'name' => fake()->unique()->randomElement($names),
            'description' => fake()->optional()->sentence(),
            'category' => fake()->randomElement(['certification', 'license', 'skill', 'qualification', 'training']),
            'issuing_body' => fake()->optional()->company(),
            'is_cof' => false,
            'requires_renewal' => fake()->boolean(30),
            'renewal_period_days' => fn (array $attrs) => $attrs['requires_renewal'] ? fake()->randomElement([365, 730, 1095]) : null,
            'color' => fake()->hexColor(),
        ];
    }
}

<?php

namespace Database\Factories\HSSE;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\Hazard;
use Illuminate\Database\Eloquent\Factories\Factory;

class HazardFactory extends Factory
{
    protected $model = Hazard::class;

    public function definition(): array
    {
        $likelihood = fake()->numberBetween(1, 5);
        $severity = fake()->numberBetween(1, 5);
        $score = $likelihood * $severity;
        $level = Hazard::computeRiskLevel($score);

        return [
            'workspace_id' => Workspace::factory(),
            'reference' => 'HAZ-'.now()->format('Y').'-'.fake()->unique()->numerify('####'),
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'category' => fake()->randomElement(Hazard::$categories),
            'location' => fake()->randomElement([
                'Shaft 1', 'Processing Plant', 'Tailings Dam', 'Workshop',
                'Open Pit', 'Underground - Level 3', 'Conveyor Belt 2',
            ]),
            'source' => fake()->sentence(),
            'potential_consequence' => fake()->sentence(),
            'likelihood' => $likelihood,
            'severity' => $severity,
            'risk_score' => $score,
            'risk_level' => $level,
            'control_measures' => fake()->randomElements([
                'Engineering controls installed', 'Administrative procedures updated',
                'PPE issued to all workers', 'Warning signs posted',
                'Regular inspections scheduled', 'Training provided',
            ], fake()->numberBetween(2, 4)),
            'residual_likelihood' => max(1, $likelihood - 1),
            'residual_severity' => $severity,
            'residual_risk_score' => max(1, $likelihood - 1) * $severity,
            'residual_risk_level' => Hazard::computeRiskLevel(max(1, $likelihood - 1) * $severity),
            'status' => fake()->randomElement(Hazard::$statuses),
            'owner_id' => User::factory(),
            'reviewer_id' => fake()->optional(0.5)->randomElement([null, User::factory()]),
            'next_review_date' => fake()->optional(0.7)->dateTimeBetween('now', '+6 months'),
        ];
    }
}

<?php

namespace Database\Factories\HSSE;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\Incident;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncidentFactory extends Factory
{
    protected $model = Incident::class;

    public function definition(): array
    {
        $types = Incident::$types;
        $severities = Incident::$severities;
        $occurredAt = fake()->dateTimeBetween('-1 year', 'now');

        return [
            'workspace_id' => Workspace::factory(),
            'reference' => 'INC-'.now()->format('Y').'-'.fake()->unique()->numerify('####'),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(2),
            'type' => fake()->randomElement($types),
            'severity' => fake()->randomElement($severities),
            'status' => fake()->randomElement([
                Incident::STATUS_OPEN, Incident::STATUS_INVESTIGATING, Incident::STATUS_CLOSED,
            ]),
            'occurred_at' => $occurredAt,
            'reported_at' => $occurredAt,
            'location' => fake()->randomElement([
                'Shaft 1 - Level 5', 'Processing Plant', 'Tailings Dam', 'Workshop', 'Open Pit - Bench 3',
            ]),
            'location_details' => ['lat' => fake()->latitude(), 'lng' => fake()->longitude()],
            'body_part_affected' => fake()->optional(0.5)->randomElement(['Left hand', 'Right leg', 'Back', 'Head']),
            'injury_type' => fake()->optional(0.5)->randomElement(['Laceration', 'Fracture', 'Bruise', 'Burn']),
            'mhsa_classification' => fake()->optional(0.3)->randomElement(['A', 'B', 'C']),
            'coida_reportable' => fake()->boolean(20),
            'coida_reference' => fake()->optional(0.2)->numerify('W.Cl.2/####'),
            'reporter_id' => User::factory(),
            'investigator_id' => fake()->optional(0.6)->randomElement([null, User::factory()]),
            'root_cause' => fake()->optional(0.5)->sentence(),
            'immediate_cause' => fake()->optional(0.6)->sentence(),
            'contributing_factors' => fake()->optional(0.4)->randomElements([
                'Inadequate PPE', 'Insufficient training', 'Equipment failure',
                'Poor housekeeping', 'Fatigue', 'Communication breakdown',
            ], 2),
        ];
    }
}

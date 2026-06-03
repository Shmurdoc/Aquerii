<?php

namespace Database\Factories\PTW;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\PTW\Models\Permit;
use Illuminate\Database\Eloquent\Factories\Factory;

class PermitFactory extends Factory
{
    protected $model = Permit::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'reference' => 'PTW-'.now()->format('Y').'-'.fake()->unique()->numerify('####'),
            'type' => fake()->randomElement(Permit::$types),
            'status' => Permit::STATUS_DRAFT,
            'title' => fake()->randomElement([
                'Welding repairs on skip',
                'Confined space entry into ore pass',
                'Scaffolding erection at processing plant',
                'HV cable termination at substation SS-12',
                'Drill and blast at open pit bench 4',
                'Critical lift: 50t crusher replacement',
                'Trench excavation for pipeline',
            ]),
            'description' => fake()->paragraph(),
            'location' => fake()->randomElement([
                'Shaft 1 - Level 3', 'Processing Plant', 'Substation SS-12',
                'Open Pit - Bench 4', 'Underground - Section 12', 'Workshop Bay 3',
            ]),
            'location_details' => [
                'section' => fake()->randomElement(['North', 'South', 'East', 'West']),
                'level' => fake()->optional(0.5)->numberBetween(1, 8),
            ],
            'equipment_id' => fake()->optional(0.4)->bothify('EQ-####'),
            'issuer_id' => User::factory(),
            'approver_id' => null,
            'holder_id' => null,
            'recipient_id' => null,
            'valid_from' => null,
            'valid_until' => null,
            'max_extension_minutes' => 0,
            'extensions_used_minutes' => 0,
            'risk_level' => fake()->randomElement(Permit::$riskLevels),
            'pre_conditions' => fake()->randomElements([
                'Gas test < 1% LEL',
                'Area barricaded with signage',
                'Rescue plan in place and briefed',
                'PPE inspected and issued',
                'Standby person designated',
                'Communication tested',
            ], fake()->numberBetween(2, 4)),
            'work_method_statement' => fake()->paragraph(),
            'ppe_required' => 'Hard hat, safety boots, hi-viz, ear plugs, gloves',
        ];
    }

    public function requested(): static
    {
        return $this->state(fn () => [
            'status' => Permit::STATUS_REQUESTED,
            'requested_at' => now(),
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => Permit::STATUS_APPROVED,
            'requested_at' => now()->subHour(),
            'approved_at' => now(),
            'approver_id' => User::factory(),
        ]);
    }

    public function issued(): static
    {
        return $this->state(fn () => [
            'status' => Permit::STATUS_ISSUED,
            'requested_at' => now()->subHours(2),
            'approved_at' => now()->subHour(),
            'issued_at' => now(),
            'approver_id' => User::factory(),
            'valid_from' => now(),
            'valid_until' => now()->addHours(8),
        ]);
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'status' => Permit::STATUS_ACTIVE,
            'requested_at' => now()->subHours(3),
            'approved_at' => now()->subHours(2),
            'issued_at' => now()->subHour(),
            'activated_at' => now(),
            'approver_id' => User::factory(),
            'holder_id' => User::factory(),
            'recipient_id' => User::factory(),
            'valid_from' => now()->subHour(),
            'valid_until' => now()->addHours(7),
        ]);
    }
}

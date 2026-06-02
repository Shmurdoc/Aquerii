<?php

namespace Database\Factories\HSSE;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\CorrectiveAction;
use Illuminate\Database\Eloquent\Factories\Factory;

class CorrectiveActionFactory extends Factory
{
    protected $model = CorrectiveAction::class;

    public function definition(): array
    {
        $status = fake()->randomElement(CorrectiveAction::$statuses);
        $completedAt = in_array($status, [
            CorrectiveAction::STATUS_COMPLETED, CorrectiveAction::STATUS_VERIFIED,
        ]) ? fake()->dateTimeBetween('-6 months', 'now') : null;

        return [
            'workspace_id' => Workspace::factory(),
            'reference' => 'CA-'.now()->format('Y').'-'.fake()->unique()->numerify('####'),
            'source_type' => fake()->randomElement(CorrectiveAction::$sourceTypes),
            'source_id' => null,
            'description' => fake()->paragraph(),
            'assigned_to' => User::factory(),
            'priority' => fake()->randomElement(CorrectiveAction::$priorities),
            'status' => $status,
            'due_date' => fake()->dateTimeBetween('-1 month', '+3 months'),
            'completed_at' => $completedAt,
            'verified_at' => $status === CorrectiveAction::STATUS_VERIFIED
                ? fake()->dateTimeBetween($completedAt, 'now')
                : null,
            'verified_by' => $status === CorrectiveAction::STATUS_VERIFIED
                ? User::factory() : null,
            'completion_evidence' => $completedAt ? fake()->sentence() : null,
        ];
    }
}

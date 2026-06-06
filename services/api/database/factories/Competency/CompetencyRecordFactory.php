<?php

namespace Database\Factories\Competency;

use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyType;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompetencyRecordFactory extends Factory
{
    protected $model = CompetencyRecord::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'user_id' => User::factory(),
            'competency_type_id' => CompetencyType::factory(),
            'reference_number' => fake()->optional()->bothify('CERT-####-????'),
            'status' => fake()->randomElement(['active', 'active', 'active', 'expired']),
            'issued_at' => fake()->dateTimeBetween('-3 years', 'now'),
            'expires_at' => fn (array $attrs) => $attrs['status'] === 'active'
                ? fake()->dateTimeBetween('now', '+2 years')
                : fake()->dateTimeBetween('-1 year', 'now'),
            'verified_at' => fake()->optional(0.7)->dateTimeBetween('-3 years', 'now'),
            'verified_by' => null,
            'document_url' => fake()->optional()->url(),
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'active',
            'expires_at' => fake()->dateTimeBetween('+1 month', '+2 years'),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'expired',
            'expires_at' => fake()->dateTimeBetween('-2 years', '-1 day'),
        ]);
    }
}

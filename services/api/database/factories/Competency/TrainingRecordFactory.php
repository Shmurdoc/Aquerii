<?php

namespace Database\Factories\Competency;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\Competency\Models\TrainingRecord;
use Illuminate\Database\Eloquent\Factories\Factory;

class TrainingRecordFactory extends Factory
{
    protected $model = TrainingRecord::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'user_id' => User::factory(),
            'competency_type_id' => CompetencyType::factory(),
            'training_name' => fake()->words(3, true),
            'provider' => fake()->optional()->company(),
            'date_completed' => fake()->dateTimeBetween('-2 years', 'now'),
            'expiry_date' => fake()->optional(0.5)->dateTimeBetween('now', '+3 years'),
            'result' => fake()->randomElement(['passed', 'passed', 'passed', 'failed']),
            'score' => fake()->optional(0.7)->randomFloat(2, 50, 100),
            'notes' => fake()->optional()->sentence(),
            'document_url' => fake()->optional()->url(),
        ];
    }
}

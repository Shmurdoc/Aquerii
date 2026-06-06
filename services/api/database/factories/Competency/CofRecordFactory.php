<?php

namespace Database\Factories\Competency;

use App\Modules\Competency\Models\CofRecord;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class CofRecordFactory extends Factory
{
    protected $model = CofRecord::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'user_id' => User::factory(),
            'type' => fake()->randomElement(['medical', 'hearing', 'vision', 'fitness']),
            'reference_number' => fake()->optional()->bothify('COF-####-????'),
            'status' => fake()->randomElement(['active', 'active', 'expired']),
            'issued_at' => fake()->dateTimeBetween('-2 years', 'now'),
            'expires_at' => fn (array $attrs) => fake()->dateTimeBetween($attrs['issued_at'], '+3 years'),
            'medical_notes' => fake()->optional()->sentence(),
            'issued_by' => fake()->optional()->name(),
            'document_url' => fake()->optional()->url(),
        ];
    }
}

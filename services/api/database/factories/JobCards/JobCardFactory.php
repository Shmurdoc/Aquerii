<?php

namespace Database\Factories\JobCards;

use App\Core\Models\Workspace;
use App\Modules\JobCards\Models\JobCard;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobCardFactory extends Factory
{
    protected $model = JobCard::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status' => fake()->randomElement(['new', 'in_progress', 'completed', 'signed_off']),
            'priority' => fake()->randomElement(['low', 'medium', 'high', 'critical']),
            'location' => fake()->address(),
            'created_by' => \App\Core\Models\User::factory(),
        ];
    }
}

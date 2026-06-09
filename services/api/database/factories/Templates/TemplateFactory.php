<?php

namespace Database\Factories\Templates;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\Templates\Models\Template;
use Illuminate\Database\Eloquent\Factories\Factory;

class TemplateFactory extends Factory
{
    protected $model = Template::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'name' => fake()->words(3, true).' Template',
            'type' => fake()->randomElement(['board', 'job_card', 'invoice', 'email', 'report']),
            'description' => fake()->sentence(),
            'content' => ['key' => 'value'],
            'variables' => null,
            'version' => '1.0.0',
            'is_public' => false,
            'created_by' => User::factory(),
        ];
    }
}

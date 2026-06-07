<?php

namespace Database\Factories;

use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmContact;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmContactFactory extends Factory
{
    protected $model = CrmContact::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
        ];
    }
}

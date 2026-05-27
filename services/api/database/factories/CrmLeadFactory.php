<?php

namespace Database\Factories;

use App\Modules\CRM\Models\CrmLead;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmLeadFactory extends Factory
{
    protected $model = CrmLead::class;

    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'status' => 'new',
        ];
    }
}

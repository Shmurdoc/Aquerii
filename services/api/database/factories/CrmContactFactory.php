<?php

namespace Database\Factories;

use App\Modules\CRM\Models\CrmContact;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmContactFactory extends Factory
{
    protected $model = CrmContact::class;

    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
        ];
    }
}

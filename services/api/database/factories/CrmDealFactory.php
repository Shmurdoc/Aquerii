<?php

namespace Database\Factories;

use App\Modules\CRM\Models\CrmDeal;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmDealFactory extends Factory
{
    protected $model = CrmDeal::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'value' => fake()->randomFloat(2, 100, 100000),
            'currency' => 'USD',
            'probability' => fake()->numberBetween(0, 100),
        ];
    }
}

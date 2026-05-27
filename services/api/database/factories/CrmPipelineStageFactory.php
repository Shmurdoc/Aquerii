<?php

namespace Database\Factories;

use App\Modules\CRM\Models\CrmPipelineStage;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmPipelineStageFactory extends Factory
{
    protected $model = CrmPipelineStage::class;

    public function definition(): array
    {
        return [
            'name' => fake()->word(),
            'position' => fake()->randomFloat(1, 0, 10),
            'win_probability' => fake()->numberBetween(0, 100),
            'color' => fake()->hexColor(),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Modules\CRM\Models\CrmPipeline;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmPipelineFactory extends Factory
{
    protected $model = CrmPipeline::class;

    public function definition(): array
    {
        return [
            'name' => fake()->word().' Pipeline',
        ];
    }
}

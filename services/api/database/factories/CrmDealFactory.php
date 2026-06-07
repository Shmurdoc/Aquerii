<?php

namespace Database\Factories;

use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmPipeline;
use App\Modules\CRM\Models\CrmPipelineStage;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmDealFactory extends Factory
{
    protected $model = CrmDeal::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'pipeline_id' => CrmPipeline::factory(),
            'stage_id' => CrmPipelineStage::factory(),
            'title' => fake()->sentence(3),
            'value' => fake()->randomFloat(2, 100, 100000),
            'currency' => 'USD',
            'probability' => fake()->numberBetween(0, 100),
        ];
    }
}

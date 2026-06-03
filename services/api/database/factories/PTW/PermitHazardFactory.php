<?php

namespace Database\Factories\PTW;

use App\Core\Models\Workspace;
use App\Modules\PTW\Models\Permit;
use App\Modules\PTW\Models\PermitHazard;
use Illuminate\Database\Eloquent\Factories\Factory;

class PermitHazardFactory extends Factory
{
    protected $model = PermitHazard::class;

    public function definition(): array
    {
        return [
            'workspace_id' => fn (array $attrs) => Permit::find($attrs['permit_id'])?->workspace_id
                ?? Workspace::factory(),
            'permit_id' => Permit::factory(),
            'description' => fake()->sentence(),
            'control_measure' => fake()->sentence(),
            'residual_risk' => fake()->randomElement(PermitHazard::$residualRisks),
            'sort_order' => 0,
            'verified' => false,
        ];
    }
}

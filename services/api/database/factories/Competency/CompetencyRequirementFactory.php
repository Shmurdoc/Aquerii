<?php

namespace Database\Factories\Competency;

use App\Modules\Competency\Models\CompetencyRequirement;
use App\Modules\Competency\Models\CompetencyType;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompetencyRequirementFactory extends Factory
{
    protected $model = CompetencyRequirement::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'competency_type_id' => CompetencyType::factory(),
            'is_mandatory' => true,
            'expiry_alert_days' => 30,
            'requirable_type' => 'workspace',
            'requirable_id' => fn (array $attrs) => $attrs['workspace_id'],
        ];
    }
}

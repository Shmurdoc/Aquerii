<?php

namespace Database\Factories\Equipment;

use App\Core\Models\Workspace;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentInspection;
use Illuminate\Database\Eloquent\Factories\Factory;

class EquipmentInspectionFactory extends Factory
{
    protected $model = EquipmentInspection::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'equipment_id' => Equipment::factory(),
            'status' => 'passed',
            'inspected_at' => now(),
        ];
    }
}

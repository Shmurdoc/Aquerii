<?php

namespace Database\Factories\Equipment;

use App\Modules\Equipment\Models\EquipmentCategory;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class EquipmentCategoryFactory extends Factory
{
    protected $model = EquipmentCategory::class;

    public function definition(): array
    {
        $names = ['Loader', 'Drill', 'Pump', 'Generator', 'Conveyor', 'Crusher', 'Vehicle', 'Compressor'];

        return [
            'workspace_id' => Workspace::factory(),
            'name' => fake()->unique()->randomElement($names),
            'description' => fake()->optional()->sentence(),
            'color' => fake()->hexColor(),
        ];
    }
}

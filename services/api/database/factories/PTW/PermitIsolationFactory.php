<?php

namespace Database\Factories\PTW;

use App\Core\Models\Workspace;
use App\Modules\PTW\Models\Permit;
use App\Modules\PTW\Models\PermitIsolation;
use Illuminate\Database\Eloquent\Factories\Factory;

class PermitIsolationFactory extends Factory
{
    protected $model = PermitIsolation::class;

    public function definition(): array
    {
        return [
            'workspace_id' => fn (array $attrs) => Permit::find($attrs['permit_id'])?->workspace_id
                ?? Workspace::factory(),
            'permit_id' => Permit::factory(),
            'isolation_point' => fake()->randomElement([
                'Conveyor 2 motor', 'Skip 1 drive', 'Substation SS-12 incomer',
                'Crusher lube pump', 'Workshop bay 3 isolator',
            ]),
            'energy_type' => fake()->randomElement(PermitIsolation::$energyTypes),
            'method' => 'LOTO',
            'lock_number' => fake()->bothify('LOCK-####'),
            'tag_number' => fake()->bothify('TAG-####'),
        ];
    }
}

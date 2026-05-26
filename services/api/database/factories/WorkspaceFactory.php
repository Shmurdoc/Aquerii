<?php

namespace Database\Factories;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class WorkspaceFactory extends Factory
{
    protected $model = Workspace::class;

    public function definition(): array
    {
        $name = fake()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(4),
            'plan' => 'free',
            'settings' => [],
            'timezone' => 'UTC',
        ];
    }
}

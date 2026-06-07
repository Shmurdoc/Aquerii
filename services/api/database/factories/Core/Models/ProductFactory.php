<?php

namespace Database\Factories\Core\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'name' => fake()->word(),
            'sku' => fake()->unique()->ean8(),
            'description' => fake()->sentence(),
            'unit_price' => fake()->randomFloat(2, 1, 1000),
            'unit' => 'pcs',
            'created_by' => User::factory(),
        ];
    }
}

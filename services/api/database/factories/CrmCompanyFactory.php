<?php

namespace Database\Factories;

use App\Modules\CRM\Models\CrmCompany;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmCompanyFactory extends Factory
{
    protected $model = CrmCompany::class;

    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'domain' => fake()->domainName(),
        ];
    }
}

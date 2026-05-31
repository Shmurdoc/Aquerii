<?php

namespace Database\Factories\Accounting;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\Accounting\Models\Account;
use App\Modules\Accounting\Models\JournalEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

class JournalEntryFactory extends Factory
{
    protected $model = JournalEntry::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'account_id' => Account::factory(),
            'entry_date' => fake()->dateTimeThisYear()->format('Y-m-d'),
            'description' => fake()->sentence(),
            'debit_amount' => fake()->randomFloat(2, 0, 10000),
            'credit_amount' => 0,
            'reference_type' => null,
            'reference_id' => null,
            'created_by' => User::factory(),
        ];
    }
}

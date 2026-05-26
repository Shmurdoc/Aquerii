<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $workspaceIds = DB::table('workspaces')->pluck('id');

        foreach ($workspaceIds as $workspaceId) {
            $this->seedAccountsForWorkspace($workspaceId);
        }
    }

    private function seedAccountsForWorkspace(string $workspaceId): void
    {
        $accounts = [
            ['code' => '1000', 'name' => 'Cash',                     'type' => 'asset'],
            ['code' => '1100', 'name' => 'Accounts Receivable',       'type' => 'asset'],
            ['code' => '1200', 'name' => 'Inventory',                 'type' => 'asset'],
            ['code' => '1300', 'name' => 'Fixed Assets',              'type' => 'asset'],
            ['code' => '2000', 'name' => 'Accounts Payable',          'type' => 'liability'],
            ['code' => '2100', 'name' => 'Accrued Expenses',          'type' => 'liability'],
            ['code' => '2200', 'name' => 'Deferred Revenue',          'type' => 'liability'],
            ['code' => '3000', 'name' => 'Retained Earnings',         'type' => 'equity'],
            ['code' => '3100', 'name' => 'Owner\'s Equity',           'type' => 'equity'],
            ['code' => '4000', 'name' => 'Sales Revenue',             'type' => 'income'],
            ['code' => '4100', 'name' => 'Service Revenue',           'type' => 'income'],
            ['code' => '5000', 'name' => 'Cost of Goods Sold',        'type' => 'expense'],
            ['code' => '5100', 'name' => 'Salaries & Wages',          'type' => 'expense'],
            ['code' => '5200', 'name' => 'Rent & Utilities',          'type' => 'expense'],
            ['code' => '5300', 'name' => 'Office Supplies',           'type' => 'expense'],
            ['code' => '5400', 'name' => 'Software & Subscriptions',  'type' => 'expense'],
            ['code' => '5500', 'name' => 'Marketing & Advertising',   'type' => 'expense'],
            ['code' => '5600', 'name' => 'Taxes & Licenses',          'type' => 'expense'],
        ];

        $firstUserId = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('role', 'admin')
            ->value('user_id');

        foreach ($accounts as $acc) {
            $exists = DB::table('accounts')
                ->where('workspace_id', $workspaceId)
                ->where('code', $acc['code'])
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('accounts')->insert([
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspaceId,
                'code' => $acc['code'],
                'name' => $acc['name'],
                'type' => $acc['type'],
                'is_active' => true,
                'created_by' => $firstUserId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info("Seeded chart of accounts for workspace {$workspaceId}");
    }
}

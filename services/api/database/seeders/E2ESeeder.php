<?php

namespace Database\Seeders;

use App\Core\Models\Board;
use App\Core\Models\BoardColumn;
use App\Core\Models\BoardGroup;
use App\Core\Models\Item;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\CRM\Models\CrmCompany;
use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\Documents\Models\Document;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class E2ESeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password_hash' => bcrypt('password123'),
            ]
        );

        $workspace = Workspace::firstOrCreate(
            ['name' => 'Test Workspace', 'owner_id' => $user->id],
            ['name' => 'Test Workspace', 'owner_id' => $user->id, 'slug' => 'test-workspace']
        );

        WorkspaceMember::firstOrCreate([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
        ], [
            'role' => 'owner',
        ]);

        // ─── Board with columns, groups, and items ────────────────────────────────
        $board = Board::firstOrCreate([
            'workspace_id' => $workspace->id,
            'name' => 'Test Board',
        ], [
            'created_by' => $user->id,
        ]);

        if ($board->columns()->doesntExist()) {
            $defaultColumns = [
                ['name' => 'Status',    'type' => 'status',   'position' => 65536,  'is_system' => true],
                ['name' => 'Assignee',  'type' => 'people',   'position' => 131072, 'is_system' => true],
                ['name' => 'Due Date',  'type' => 'date',     'position' => 196608, 'is_system' => true],
                ['name' => 'Priority',  'type' => 'priority', 'position' => 262144, 'is_system' => true],
            ];
            foreach ($defaultColumns as $col) {
                BoardColumn::create(array_merge($col, [
                    'board_id' => $board->id,
                    'workspace_id' => $workspace->id,
                ]));
            }
        }

        $group = BoardGroup::firstOrCreate([
            'board_id' => $board->id,
            'workspace_id' => $workspace->id,
            'name' => 'Group 1',
        ], [
            'color' => '#6366f1',
            'position' => 65536,
        ]);

        if ($group->items()->doesntExist()) {
            $items = [
                ['title' => 'Design new landing page', 'priority' => 'high', 'status' => 'active'],
                ['title' => 'Fix login redirect bug',   'priority' => 'urgent', 'status' => 'active'],
                ['title' => 'Write API documentation',  'priority' => 'medium', 'status' => 'done'],
            ];
            foreach ($items as $itemData) {
                Item::create([
                    'workspace_id' => $workspace->id,
                    'board_id' => $board->id,
                    'group_id' => $group->id,
                    'title' => $itemData['title'],
                    'priority' => $itemData['priority'],
                    'status' => $itemData['status'],
                    'position' => 65536,
                    'created_by' => $user->id,
                    'column_values' => ['status' => $itemData['status']],
                ]);
            }
        }

        // ─── Document ─────────────────────────────────────────────────────────────
        Document::firstOrCreate([
            'workspace_id' => $workspace->id,
            'title' => 'Getting Started Guide',
        ], [
            'content' => json_encode(['type' => 'doc', 'content' => []]),
            'created_by' => $user->id,
        ]);

        // ─── CRM pipeline, company, contact, deal ─────────────────────────────────
        $pipeline = DB::table('crm_pipelines')
            ->where('workspace_id', $workspace->id)
            ->where('name', 'Sales Pipeline')
            ->first();

        if (! $pipeline) {
            $pipelineId = Str::uuid()->toString();
            DB::table('crm_pipelines')->insert([
                'id' => $pipelineId,
                'workspace_id' => $workspace->id,
                'name' => 'Sales Pipeline',
                'is_default' => true,
                'created_at' => now(),
            ]);

            $defaultStages = [
                ['name' => 'Lead',         'color' => '#6366f1', 'win_probability' => 10],
                ['name' => 'Qualified',    'color' => '#8b5cf6', 'win_probability' => 25],
                ['name' => 'Proposal',     'color' => '#3b82f6', 'win_probability' => 50],
                ['name' => 'Negotiation',  'color' => '#f59e0b', 'win_probability' => 75],
                ['name' => 'Closed Won',   'color' => '#22c55e', 'win_probability' => 100],
                ['name' => 'Closed Lost',  'color' => '#ef4444', 'win_probability' => 0],
            ];

            foreach ($defaultStages as $i => $stage) {
                DB::table('crm_pipeline_stages')->insert([
                    'id' => Str::uuid()->toString(),
                    'workspace_id' => $workspace->id,
                    'pipeline_id' => $pipelineId,
                    'name' => $stage['name'],
                    'color' => $stage['color'],
                    'position' => ($i + 1) * 65536,
                    'win_probability' => $stage['win_probability'],
                ]);
            }

            $pipeline = (object) ['id' => $pipelineId];
        }

        $leadStage = DB::table('crm_pipeline_stages')
            ->where('pipeline_id', $pipeline->id)
            ->where('name', 'Lead')
            ->first();

        $company = CrmCompany::firstOrCreate([
            'workspace_id' => $workspace->id,
            'name' => 'Acme Corp',
        ], [
            'domain' => 'acme.example.com',
            'industry' => 'Technology',
            'country' => 'US',
            'created_by' => $user->id,
        ]);

        $contact = CrmContact::firstOrCreate([
            'workspace_id' => $workspace->id,
            'name' => 'Jane Doe',
        ], [
            'email' => 'jane@acme.example.com',
            'company_id' => $company->id,
            'job_title' => 'CTO',
            'created_by' => $user->id,
        ]);

        if ($leadStage) {
            CrmDeal::firstOrCreate([
                'workspace_id' => $workspace->id,
                'pipeline_id' => $pipeline->id,
                'title' => 'Enterprise License',
            ], [
                'stage_id' => $leadStage->id,
                'contact_id' => $contact->id,
                'company_id' => $company->id,
                'value' => 50000,
                'currency' => 'USD',
                'probability' => 10,
                'created_by' => $user->id,
            ]);
        }
    }
}

<?php

namespace App\Console\Commands;

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
use App\Modules\CRM\Models\CrmLead;
use App\Modules\CRM\Models\CrmProduct;
use App\Modules\HSSE\Models\CorrectiveAction;
use App\Modules\HSSE\Models\Hazard;
use App\Modules\HSSE\Models\Incident;
use App\Modules\Inventory\Models\InventoryCategory;
use App\Modules\Inventory\Models\Product;
use App\Modules\PTW\Models\Permit;
use App\Modules\Support\Models\Ticket;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProvisionPilot extends Command
{
    protected $signature = 'provision:pilot
        {--workspace-name=Pilot Mine Workspace : Name of the pilot workspace}
        {--slug=pilot-mine : URL slug for the workspace}
        {--password=password : Default password for all pilot users}';

    protected $description = 'Provision the pilot mine workspace with users and seed data';

    private const PILOT_DOMAIN = 'pilot.example.com';

    private array $users = [
        ['name' => 'Sipho Mthembu',         'role' => 'owner',  'title' => 'Mine Manager'],
        ['name' => 'Nomsa Dlamini',         'role' => 'admin',  'title' => 'Safety Officer (HSSE)'],
        ['name' => 'Thandiwe Naidoo',       'role' => 'admin',  'title' => 'Shift Supervisor'],
        ['name' => 'Bongani Khumalo',       'role' => 'member', 'title' => 'Equipment Operator'],
        ['name' => 'Lerato Molefe',         'role' => 'member', 'title' => 'Maintenance Technician'],
        ['name' => 'Johan van der Merwe',   'role' => 'admin',  'title' => 'HR Coordinator'],
        ['name' => 'Fatima Patel',          'role' => 'member', 'title' => 'Environmental Officer'],
        ['name' => 'Sibusiso Ndlovu',       'role' => 'viewer', 'title' => 'Admin Clerk'],
        ['name' => 'Mandla Zwane',          'role' => 'member', 'title' => 'Storeman (Inventory)'],
        ['name' => 'Palesa Motaung',        'role' => 'member', 'title' => 'Contractor Supervisor'],
    ];

    private array $miningHazards = [
        ['title' => 'Unguarded conveyor belt nip point at conveyor C-4 processing plant', 'category' => 'mechanical', 'location' => 'Processing Plant - Conveyor C-4'],
        ['title' => 'Excessive dust levels in underground section 12 (respirable crystalline silica)', 'category' => 'chemical', 'location' => 'Underground - Section 12'],
        ['title' => 'Unstable hanging wall in stope 3B with loose rock after blast', 'category' => 'physical', 'location' => 'Underground - Stope 3B'],
        ['title' => 'Diesel fumes accumulation in decline shaft due to poor ventilation', 'category' => 'chemical', 'location' => 'Decline Shaft - Level 5'],
        ['title' => 'High noise levels (>105 dBA) from primary crusher without hearing protection zone', 'category' => 'physical', 'location' => 'Primary Crusher Station'],
        ['title' => 'Damaged trailing cable on LHD vehicle exposing live conductors', 'category' => 'electrical', 'location' => 'Underground - Level 4'],
        ['title' => 'Missing guardrails on elevated walkway above thickener tank', 'category' => 'physical', 'location' => 'Processing Plant - Thickener Area'],
        ['title' => 'Chemical spill containment bund at diesel storage area is cracked and leaking', 'category' => 'environmental', 'location' => 'Diesel Storage Yard'],
    ];

    private array $miningIncidents = [
        ['title' => 'LHD collides with ventilation door in decline', 'type' => 'property_damage', 'severity' => 'medium', 'location' => 'Decline - Level 3'],
        ['title' => 'Worker slips on wet floor in change house', 'type' => 'first_aid', 'severity' => 'low', 'location' => 'Change House'],
        ['title' => 'Near miss: falling rock from scoop bucket during tramming', 'type' => 'near_miss', 'severity' => 'high', 'location' => 'Underground - Level 7'],
        ['title' => 'Minor conveyor belt fire due to seized roller bearing', 'type' => 'property_damage', 'severity' => 'medium', 'location' => 'Conveyor Belt 2'],
    ];

    private array $deals = [
        ['title' => 'Annual PPE Supply Contract', 'value' => 2500000, 'stage' => 'Negotiation', 'probability' => 75],
        ['title' => 'Fleet Maintenance Agreement - 12 LHD Units', 'value' => 4800000, 'stage' => 'Proposal', 'probability' => 50],
        ['title' => 'Explosives Supply - Quarterly Bulk Order', 'value' => 3800000, 'stage' => 'Qualified', 'probability' => 25],
        ['title' => 'Conveyor Belt Replacement Program', 'value' => 1800000, 'stage' => 'Negotiation', 'probability' => 80],
        ['title' => 'Ventilation Fan Upgrade - Shaft 2', 'value' => 950000, 'stage' => 'Proposal', 'probability' => 40],
        ['title' => 'Water Treatment Chemicals - 6 Month Supply', 'value' => 450000, 'stage' => 'Lead', 'probability' => 10],
        ['title' => 'Underground Communication System Installation', 'value' => 3200000, 'stage' => 'Qualified', 'probability' => 30],
        ['title' => 'Safety Equipment & PPE Refurbishment', 'value' => 1200000, 'stage' => 'Closed Won', 'probability' => 100],
    ];

    private array $companies = [
        ['name' => 'African Mining Supplies (Pty) Ltd',         'industry' => 'Mining Equipment'],
        ['name' => 'RSA Blasting Solutions',                    'industry' => 'Explosives'],
        ['name' => 'Mponeng Engineering Works',                 'industry' => 'Engineering'],
        ['name' => 'Ventilation & Cooling Systems SA',          'industry' => 'HVAC'],
        ['name' => 'Steadfast PPE Manufacturing',               'industry' => 'Safety Equipment'],
        ['name' => 'Shaft Sinkers Consolidated',                 'industry' => 'Mining Services'],
        ['name' => 'Tshepo Transport & Logistics',              'industry' => 'Logistics'],
        ['name' => 'HydroTech Water Treatment',                  'industry' => 'Water Treatment'],
    ];

    private array $leads = [
        ['first_name' => 'James',       'last_name' => 'Khosa',    'company_name' => 'Mining Tech Innovations',   'status' => 'new'],
        ['first_name' => 'Sarah',       'last_name' => 'Venter',   'company_name' => 'EcoWaste Solutions',        'status' => 'contacted'],
        ['first_name' => 'Tendai',      'last_name' => 'Moyo',     'company_name' => 'Bolts & Bits Mining',       'status' => 'qualified'],
        ['first_name' => 'Elizabeth',   'last_name' => 'du Toit',  'company_name' => 'PowerGrid Electrical',      'status' => 'new'],
        ['first_name' => 'Mpho',        'last_name' => 'Letsoalo', 'company_name' => 'ConveyorTech SA',           'status' => 'contacted'],
        ['first_name' => 'Herman',      'last_name' => 'Smit',     'company_name' => 'BlastIQ Software',          'status' => 'qualified'],
    ];

    private array $inventoryProducts = [
        ['name' => 'Mining Hard Hat - Yellow (SANS approved)',          'sku' => 'PPE-HH-001',  'unit_price' => 185.00,  'category' => 'PPE'],
        ['name' => 'Safety Goggles - Anti-Fog',                         'sku' => 'PPE-SG-002',  'unit_price' => 95.50,   'category' => 'PPE'],
        ['name' => 'Nitrile Gloves - Heavy Duty (Box 100)',             'sku' => 'PPE-GL-003',  'unit_price' => 245.00,  'category' => 'PPE'],
        ['name' => 'Reflective Hi-Viz Vest - Class 3',                  'sku' => 'PPE-HV-004',  'unit_price' => 130.00,  'category' => 'PPE'],
        ['name' => 'Conveyor Belt Roller - 159mm x 600mm',              'sku' => 'MC-CR-001',  'unit_price' => 2850.00, 'category' => 'Mechanical'],
        ['name' => 'LHD Bucket Tooth Assembly',                         'sku' => 'MC-BT-002',  'unit_price' => 12500.00, 'category' => 'Mechanical'],
        ['name' => 'Diesel Engine Oil 15W-40 (20L)',                    'sku' => 'LUB-OIL-001', 'unit_price' => 890.00,  'category' => 'Lubricants'],
        ['name' => 'Hydraulic Filter - Compatible with Sandvik LHD',    'sku' => 'FL-HF-001',  'unit_price' => 450.00,  'category' => 'Filters'],
        ['name' => 'Ventilation Ducting - 800mm Diameter (10m section)', 'sku' => 'VEN-DC-001',  'unit_price' => 3200.00, 'category' => 'Ventilation'],
        ['name' => 'Self-Rescuer Device - Ozark SRL (OHD)',            'sku' => 'SAF-SR-001',  'unit_price' => 4250.00, 'category' => 'Safety Equipment'],
    ];

    private array $tickets = [
        ['subject' => 'LHD Engine Overheating - Unit 7',                             'priority' => 'high',   'status' => 'open'],
        ['subject' => 'Network connectivity issues at underground office level 5',   'priority' => 'medium', 'status' => 'open'],
        ['subject' => 'Missing PPE inventory - respirator cartridges',               'priority' => 'low',    'status' => 'in_progress'],
        ['subject' => 'Shaft 1 winder brake system requires urgent inspection',       'priority' => 'urgent', 'status' => 'open'],
        ['subject' => 'Employee badge access not working for new shift crews',        'priority' => 'medium', 'status' => 'resolved'],
    ];

    private array $boardItems = [
        ['title' => 'Complete HSSE risk assessment for shaft 3 expansion',    'priority' => 'high'],
        ['title' => 'Finalize Q3 explosive procurement contract',             'priority' => 'urgent'],
        ['title' => 'Schedule LHD operator refresher training',               'priority' => 'medium'],
        ['title' => 'Update emergency evacuation plan for processing plant',  'priority' => 'high'],
        ['title' => 'Review ventilation airflow measurements at level 8',     'priority' => 'medium'],
    ];

    public function handle(): int
    {
        $wsName = $this->option('workspace-name');
        $slug = $this->option('slug');
        $password = $this->option('password');

        $this->info("Provisioning pilot workspace: {$wsName}");

        if ($this->confirm("This will create/update the '{$wsName}' workspace with test data. Continue?", true)) {
            DB::beginTransaction();
            try {
                $workspace = $this->createWorkspace($wsName, $slug);
                $crew = $this->createUsers($workspace, $password);
                $owner = $this->getOwner($crew);
                $this->seedPipelines($workspace, $owner);
                $companies = $this->seedCompanies($workspace, $owner);
                $contacts = $this->seedContacts($workspace, $companies, $crew);
                $this->seedDeals($workspace, $contacts, $companies, $owner);
                $this->seedLeads($workspace, $crew);
                $this->seedProducts($workspace, $owner);
                $this->seedHazards($workspace, $crew);
                $this->seedIncidents($workspace, $crew);
                $this->seedCorrectiveActions($workspace, $crew);
                $this->seedPermits($workspace, $crew);
                $this->seedTickets($workspace, $contacts, $crew);
                $this->seedBoardItems($workspace, $owner);
                $this->seedInventory($workspace, $owner);

                DB::commit();

                $this->outputSummary($workspace, $crew, $password);

                return Command::SUCCESS;
            } catch (\Throwable $e) {
                DB::rollBack();
                $this->error("Provisioning failed: {$e->getMessage()}");
                $this->error("File: {$e->getFile()}:{$e->getLine()}");

                return Command::FAILURE;
            }
        }

        return Command::SUCCESS;
    }

    private function createWorkspace(string $name, string $slug): Workspace
    {
        $owner = User::firstOrCreate(
            ['email' => 'owner@'.self::PILOT_DOMAIN],
            [
                'name' => 'System Owner',
                'password_hash' => bcrypt('password'),
                'email_verified_at' => now(),
            ]
        );

        $workspace = Workspace::withTrashed()->firstOrCreate(
            ['slug' => $slug],
            [
                'name' => $name,
                'owner_id' => $owner->id,
                'plan' => 'free',
                'settings' => ['industry' => 'mining', 'country' => 'ZA'],
                'timezone' => 'Africa/Johannesburg',
            ]
        );
        if ($workspace->trashed()) {
            $workspace->restore();
        }

        WorkspaceMember::withTrashed()->firstOrCreate(
            ['workspace_id' => $workspace->id, 'user_id' => $owner->id],
            ['role' => 'owner', 'status' => 'active', 'joined_at' => now()]
        );

        $this->info("Workspace [{$workspace->name}] ready (ID: {$workspace->id})");

        return $workspace;
    }

    private function createUsers(Workspace $workspace, string $password): array
    {
        $crew = [];
        foreach ($this->users as $i => $spec) {
            $email = sprintf('%s@%s', Str::slug($spec['name']), self::PILOT_DOMAIN);

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $spec['name'],
                    'password_hash' => bcrypt($password),
                    'email_verified_at' => now(),
                    'timezone' => 'Africa/Johannesburg',
                    'locale' => 'en',
                ]
            );
            if ($user->wasRecentlyCreated) {
                $user->email_verified_at = now();
                $user->save();
            }

            WorkspaceMember::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'user_id' => $user->id],
                [
                    'role' => $spec['role'],
                    'status' => 'active',
                    'joined_at' => now(),
                    'job_title' => $spec['title'],
                    'department' => $this->departmentForTitle($spec['title']),
                ]
            );

            $crew[] = ['user' => $user, 'role' => $spec['role'], 'title' => $spec['title']];

            $this->line("  Created user: {$spec['name']} <{$email}> ({$spec['role']})");
        }

        // First user is the owner
        $crew[0]['is_owner'] = true;

        return $crew;
    }

    private function departmentForTitle(string $title): string
    {
        return match (true) {
            str_contains($title, 'Mine Manager') => 'Management',
            str_contains($title, 'Safety') || str_contains($title, 'HSSE') => 'HSSE',
            str_contains($title, 'Supervisor') => 'Operations',
            str_contains($title, 'Operator') => 'Operations',
            str_contains($title, 'Maintenance') || str_contains($title, 'Technician') => 'Engineering',
            str_contains($title, 'HR') => 'Human Resources',
            str_contains($title, 'Environmental') => 'Environmental',
            str_contains($title, 'Admin') => 'Administration',
            str_contains($title, 'Storeman') || str_contains($title, 'Inventory') => 'Supply Chain',
            str_contains($title, 'Contractor') => 'Contracts',
            default => 'General',
        };
    }

    private function pickUser(array $crew, ?string $role = null, ?string $titleContains = null): User
    {
        $filtered = $crew;
        if ($role) {
            $filtered = array_values(array_filter($filtered, fn ($c) => $c['role'] === $role));
        }
        if ($titleContains) {
            $filtered = array_values(array_filter($filtered, fn ($c) => str_contains($c['title'], $titleContains)));
        }
        if (empty($filtered)) {
            $filtered = $crew;
        }

        return $filtered[array_rand($filtered)]['user'];
    }

    private function getOwner(array $crew): User
    {
        foreach ($crew as $c) {
            if ($c['role'] === 'owner') {
                return $c['user'];
            }
        }

        return $crew[0]['user'];
    }

    private function seedPipelines(Workspace $workspace, User $owner): void
    {
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

            $stages = [
                ['name' => 'Lead',         'color' => '#6366f1', 'win_probability' => 10],
                ['name' => 'Qualified',    'color' => '#8b5cf6', 'win_probability' => 25],
                ['name' => 'Proposal',     'color' => '#3b82f6', 'win_probability' => 50],
                ['name' => 'Negotiation',  'color' => '#f59e0b', 'win_probability' => 75],
                ['name' => 'Closed Won',   'color' => '#22c55e', 'win_probability' => 100],
                ['name' => 'Closed Lost',  'color' => '#ef4444', 'win_probability' => 0],
            ];

            foreach ($stages as $i => $stage) {
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
        }

        $this->line('  CRM pipeline ready');
    }

    private function stageForName(Workspace $workspace, string $name): ?object
    {
        $pipeline = DB::table('crm_pipelines')
            ->where('workspace_id', $workspace->id)
            ->where('is_default', true)
            ->first();

        if (! $pipeline) {
            return null;
        }

        return DB::table('crm_pipeline_stages')
            ->where('pipeline_id', $pipeline->id)
            ->where('name', $name)
            ->first();
    }

    private function seedCompanies(Workspace $workspace, User $owner): array
    {
        $companies = [];
        foreach ($this->companies as $spec) {
            $company = CrmCompany::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'name' => $spec['name']],
                ['industry' => $spec['industry']]
            );
            if ($company->trashed()) {
                $company->restore();
            }
            $companies[] = $company;
        }
        $this->line('  '.count($companies).' CRM companies seeded');

        return $companies;
    }

    private function seedContacts(Workspace $workspace, array $companies, array $crew): array
    {
        $contactData = [
            ['first_name' => 'Johannes', 'last_name' => 'Pretorius', 'email' => 'j.pretorius@amshipping.co.za', 'job_title' => 'Procurement Director'],
            ['first_name' => 'Maria',    'last_name' => 'Chauke',    'email' => 'm.chauke@rsablast.co.za',      'job_title' => 'Operations Manager'],
            ['first_name' => 'Eugene',   'last_name' => 'Terblanche', 'email' => 'e.terblanche@mponeng.co.za',   'job_title' => 'Chief Engineer'],
            ['first_name' => 'Naledi',   'last_name' => 'Moeketsi',  'email' => 'n.moeketsi@ventcool.co.za',    'job_title' => 'Sales Executive'],
            ['first_name' => 'Shaun',    'last_name' => 'Naidoo',    'email' => 's.naidoo@steadfastppe.co.za',  'job_title' => 'Account Manager'],
            ['first_name' => 'Pauline',  'last_name' => 'Mbatha',    'email' => 'p.mbatha@shaftsinkers.co.za',  'job_title' => 'Contracts Manager'],
            ['first_name' => 'Pieter',   'last_name' => 'de Jongh',  'email' => 'p.dejongh@tshepotransport.co.za', 'job_title' => 'Logistics Coordinator'],
            ['first_name' => 'Rebecca',  'last_name' => 'Mthembu',   'email' => 'r.mthembu@hydrotech.co.za',    'job_title' => 'Technical Advisor'],
        ];

        $contacts = [];
        foreach ($contactData as $i => $spec) {
            $company = $companies[$i % count($companies)];
            $contact = CrmContact::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'email' => $spec['email']],
                [
                    'first_name' => $spec['first_name'],
                    'last_name' => $spec['last_name'],
                    'company_id' => $company->id,
                    'job_title' => $spec['job_title'],
                ]
            );
            if ($contact->trashed()) {
                $contact->restore();
            }
            $contacts[] = $contact;
        }
        $this->line('  '.count($contacts).' CRM contacts seeded');

        return $contacts;
    }

    private function seedDeals(Workspace $workspace, array $contacts, array $companies, User $owner): void
    {
        foreach ($this->deals as $i => $spec) {
            $stage = $this->stageForName($workspace, $spec['stage']);
            if (! $stage) {
                continue;
            }

            $pipeline = DB::table('crm_pipelines')
                ->where('workspace_id', $workspace->id)
                ->where('is_default', true)
                ->first();

            $contact = $contacts[$i % count($contacts)];
            $company = $companies[$i % count($companies)];

            CrmDeal::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'title' => $spec['title']],
                [
                    'pipeline_id' => $pipeline->id,
                    'stage_id' => $stage->id,
                    'contact_id' => $contact->id,
                    'company_id' => $company->id,
                    'value' => $spec['value'],
                    'currency' => 'ZAR',
                    'probability' => $spec['probability'],
                    'created_by' => $owner->id,
                ]
            );
        }
        $this->line('  '.count($this->deals).' CRM deals seeded');
    }

    private function seedLeads(Workspace $workspace, array $crew): void
    {
        foreach ($this->leads as $spec) {
            $email = sprintf('%s.%s@%s', $spec['first_name'], $spec['last_name'], self::PILOT_DOMAIN);

            CrmLead::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'email' => $email],
                [
                    'first_name' => $spec['first_name'],
                    'last_name' => $spec['last_name'],
                    'company_name' => $spec['company_name'],
                    'status' => $spec['status'],
                    'assigned_to' => $this->pickUser($crew, 'member')?->id,
                ]
            );
        }
        $this->line('  '.count($this->leads).' CRM leads seeded');
    }

    private function seedProducts(Workspace $workspace, User $owner): void
    {
        $categories = ['Safety Equipment', 'PPE', 'Mechanical Spares', 'Electrical Supplies', 'Lubricants & Chemicals'];
        foreach ($categories as $catName) {
            CrmProduct::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'name' => $catName],
                [
                    'sku' => 'CAT-'.strtoupper(Str::slug($catName)),
                    'unit_price' => 0,
                    'currency' => 'ZAR',
                    'is_active' => true,
                    'created_by' => $owner->id,
                ]
            );
        }
        $this->line('  '.count($categories).' CRM product categories seeded');
    }

    private function seedHazards(Workspace $workspace, array $crew): void
    {
        foreach ($this->miningHazards as $spec) {
            $likelihood = rand(2, 5);
            $severity = rand(2, 5);
            $score = $likelihood * $severity;

            Hazard::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'title' => $spec['title']],
                [
                    'reference' => 'HAZ-'.now()->format('Y').'-'.str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT),
                    'description' => 'Identified during routine inspection at '.$spec['location'],
                    'category' => $spec['category'],
                    'location' => $spec['location'],
                    'source' => 'Routine safety inspection',
                    'potential_consequence' => match ($spec['category']) {
                        'mechanical' => 'Crush injury or amputation',
                        'chemical' => 'Respiratory disease or poisoning',
                        'physical' => 'Fall from height or impact injury',
                        'electrical' => 'Electric shock or arc flash',
                        'environmental' => 'Environmental contamination',
                        default => 'Injury to personnel',
                    },
                    'likelihood' => $likelihood,
                    'severity' => $severity,
                    'risk_score' => $score,
                    'risk_level' => Hazard::computeRiskLevel($score),
                    'control_measures' => ['Engineering controls required', 'Administrative controls', 'PPE issued'],
                    'residual_likelihood' => max(1, $likelihood - 1),
                    'residual_severity' => $severity,
                    'residual_risk_score' => max(1, $likelihood - 1) * $severity,
                    'residual_risk_level' => Hazard::computeRiskLevel(max(1, $likelihood - 1) * $severity),
                    'status' => 'identified',
                    'owner_id' => $this->pickUser($crew, titleContains: 'Safety')->id,
                    'reviewer_id' => $this->pickUser($crew, 'admin')->id,
                    'next_review_date' => now()->addDays(rand(30, 90)),
                ]
            );
        }
        $this->line('  '.count($this->miningHazards).' hazards seeded');
    }

    private function seedIncidents(Workspace $workspace, array $crew): void
    {
        $occurredAt = now()->subDays(rand(1, 180));
        foreach ($this->miningIncidents as $spec) {
            Incident::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'title' => $spec['title']],
                [
                    'reference' => 'INC-'.now()->format('Y').'-'.str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT),
                    'description' => 'Incident reported at '.$spec['location'],
                    'type' => $spec['type'],
                    'severity' => $spec['severity'],
                    'status' => Incident::STATUS_OPEN,
                    'occurred_at' => $occurredAt,
                    'reported_at' => $occurredAt,
                    'location' => $spec['location'],
                    'reporter_id' => $this->pickUser($crew, titleContains: 'Safety')->id,
                    'investigator_id' => $this->pickUser($crew, 'admin')->id,
                ]
            );
        }
        $this->line('  '.count($this->miningIncidents).' incidents seeded');
    }

    private function seedCorrectiveActions(Workspace $workspace, array $crew): void
    {
        $actions = [
            ['description' => 'Install guardrails on elevated walkway above thickener tank', 'source_type' => CorrectiveAction::SOURCE_HAZARD],
            ['description' => 'Replace damaged trailing cable on LHD vehicle per SANS 10142', 'source_type' => CorrectiveAction::SOURCE_INCIDENT],
            ['description' => 'Conduct dust level monitoring campaign in underground section 12', 'source_type' => CorrectiveAction::SOURCE_INSPECTION],
        ];

        foreach ($actions as $spec) {
            CorrectiveAction::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'description' => $spec['description']],
                [
                    'reference' => 'CA-'.now()->format('Y').'-'.str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT),
                    'source_type' => $spec['source_type'],
                    'assigned_to' => $this->pickUser($crew, titleContains: 'Safety')->id,
                    'priority' => CorrectiveAction::PRIORITY_HIGH,
                    'status' => CorrectiveAction::STATUS_OPEN,
                    'due_date' => now()->addDays(rand(7, 60)),
                ]
            );
        }
        $this->line('  '.count($actions).' corrective actions seeded');
    }

    private function seedPermits(Workspace $workspace, array $crew): void
    {
        $now = now();
        $permits = [
            ['title' => 'Welding repairs on skip at shaft 1',       'type' => Permit::TYPE_HOT_WORK,           'status' => Permit::STATUS_ACTIVE, 'risk' => 'medium'],
            ['title' => 'Confined space entry into ore pass bin',   'type' => Permit::TYPE_CONFINED_SPACE,      'status' => Permit::STATUS_ISSUED, 'risk' => 'high'],
            ['title' => 'Scaffolding erection at processing plant',  'type' => Permit::TYPE_WORK_AT_HEIGHT,     'status' => Permit::STATUS_REQUESTED, 'risk' => 'medium'],
            ['title' => 'HV cable termination at substation SS-12', 'type' => Permit::TYPE_ELECTRICAL_ISOLATION, 'status' => Permit::STATUS_APPROVED, 'risk' => 'extreme'],
            ['title' => 'Drill and blast at open pit bench 4',      'type' => Permit::TYPE_BLASTING,           'status' => Permit::STATUS_DRAFT, 'risk' => 'extreme'],
        ];

        $safetyOfficer = $this->pickUser($crew, titleContains: 'Safety');
        $manager = $this->pickUser($crew, role: 'owner');

        foreach ($permits as $spec) {
            Permit::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'title' => $spec['title']],
                [
                    'reference' => 'PTW-'.now()->format('Y').'-'.str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT),
                    'type' => $spec['type'],
                    'status' => $spec['status'],
                    'description' => 'Permit for '.$spec['title'],
                    'location' => ['Shaft 1 - Level 3', 'Processing Plant', 'Substation SS-12', 'Open Pit - Bench 4'][array_rand(['Shaft 1 - Level 3', 'Processing Plant', 'Substation SS-12', 'Open Pit - Bench 4'])],
                    'risk_level' => $spec['risk'],
                    'issuer_id' => $safetyOfficer->id,
                    'approver_id' => $manager->id,
                    'valid_from' => $now,
                    'valid_until' => $now->copy()->addHours(8),
                    'pre_conditions' => ['Gas test < 1% LEL', 'Area barricaded', 'PPE inspected and issued'],
                    'work_method_statement' => 'Standard operating procedure for '.$spec['type'].' work',
                    'ppe_required' => 'Hard hat, safety boots, hi-viz, ear plugs, gloves, safety glasses',
                ]
            );
        }
        $this->line('  '.count($permits).' PTW permits seeded');
    }

    private function seedTickets(Workspace $workspace, array $contacts, array $crew): void
    {
        foreach ($this->tickets as $i => $spec) {
            $contact = $contacts[$i % count($contacts)];

            Ticket::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'subject' => $spec['subject']],
                [
                    'contact_id' => $contact->id,
                    'description' => 'Reported issue: '.$spec['subject'],
                    'status' => $spec['status'],
                    'priority' => $spec['priority'],
                    'channel' => 'email',
                    'assigned_to' => $this->pickUser($crew, titleContains: 'Maintenance')?->id,
                    'source' => 'email',
                ]
            );
        }
        $this->line('  '.count($this->tickets).' support tickets seeded');
    }

    private function seedBoardItems(Workspace $workspace, User $owner): void
    {
        $board = Board::withTrashed()->firstOrCreate(
            ['workspace_id' => $workspace->id, 'name' => 'Pilot Mine Operations'],
            ['created_by' => $owner->id]
        );
        if ($board->trashed()) {
            $board->restore();
        }

        if ($board->columns()->doesntExist()) {
            $defaultColumns = [
                ['name' => 'Status',   'type' => 'status',   'position' => 65536,  'is_system' => true],
                ['name' => 'Assignee', 'type' => 'people',   'position' => 131072, 'is_system' => true],
                ['name' => 'Due Date', 'type' => 'date',     'position' => 196608, 'is_system' => true],
                ['name' => 'Priority', 'type' => 'priority', 'position' => 262144, 'is_system' => true],
            ];
            foreach ($defaultColumns as $col) {
                BoardColumn::create(array_merge($col, [
                    'board_id' => $board->id,
                    'workspace_id' => $workspace->id,
                ]));
            }
        }

        $group = BoardGroup::firstOrCreate(
            ['board_id' => $board->id, 'workspace_id' => $workspace->id, 'name' => 'Q3 Objectives'],
            ['color' => '#6366f1', 'position' => 65536]
        );

        foreach ($this->boardItems as $spec) {
            Item::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'board_id' => $board->id, 'title' => $spec['title']],
                [
                    'group_id' => $group->id,
                    'priority' => $spec['priority'],
                    'status' => 'active',
                    'position' => 65536,
                    'column_values' => ['status' => 'active', 'priority' => $spec['priority']],
                    'created_by' => $owner->id,
                ]
            );
        }
        $this->line('  '.count($this->boardItems).' board items seeded');
    }

    private function seedInventory(Workspace $workspace, User $owner): void
    {
        $categoryMap = [];
        foreach ($this->inventoryProducts as $spec) {
            if (! isset($categoryMap[$spec['category']])) {
                $cat = InventoryCategory::withTrashed()->firstOrCreate(
                    ['workspace_id' => $workspace->id, 'name' => $spec['category']],
                    ['created_by' => $owner->id]
                );
                if ($cat->trashed()) {
                    $cat->restore();
                }
                $categoryMap[$spec['category']] = $cat->id;
            }

            Product::withTrashed()->firstOrCreate(
                ['workspace_id' => $workspace->id, 'sku' => $spec['sku']],
                [
                    'name' => $spec['name'],
                    'category_id' => $categoryMap[$spec['category']],
                    'unit_price' => $spec['unit_price'],
                    'unit' => 'each',
                    'currency' => 'ZAR',
                    'created_by' => $owner->id,
                ]
            );
        }
        $this->line('  '.count($this->inventoryProducts).' inventory products seeded');
    }

    private function outputSummary(Workspace $workspace, array $crew, string $password): void
    {
        $this->newLine();
        $this->info('╔══════════════════════════════════════════════════════════╗');
        $this->info('║         PILOT MINE PROVISIONING COMPLETE               ║');
        $this->info('╚══════════════════════════════════════════════════════════╝');
        $this->newLine();
        $this->warn('  Workspace:');
        $this->info("    Name: {$workspace->name}");
        $this->info("    Slug: {$workspace->slug}");
        $this->info("    ID:   {$workspace->id}");
        $this->newLine();
        $this->warn('  Users:');
        foreach ($crew as $c) {
            $email = sprintf('%s@%s', Str::slug($c['user']->name), self::PILOT_DOMAIN);
            $this->info("    {$c['title']}: {$c['user']->name} / {$email} / password: {$password} / role: {$c['role']}");
        }
        $this->newLine();
        $this->warn('  Seeded data:');
        $this->info('    HSSE Hazards: '.count($this->miningHazards));
        $this->info('    HSSE Incidents: '.count($this->miningIncidents));
        $this->info('    Corrective Actions: 3');
        $this->info('    CRM Deals: '.count($this->deals));
        $this->info('    CRM Leads: '.count($this->leads));
        $this->info('    CRM Contacts: 8');
        $this->info('    CRM Companies: '.count($this->companies));
        $this->info('    CRM Product Categories: 5');
        $this->info('    Inventory Products: '.count($this->inventoryProducts));
        $this->info('    PTW Permits: 5');
        $this->info('    Support Tickets: '.count($this->tickets));
        $this->info('    Board Items: '.count($this->boardItems));
        $this->newLine();
        $this->warn('  Login URL: http://localhost/login');
        $this->newLine();
    }
}

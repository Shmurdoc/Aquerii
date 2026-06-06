<?php

/*
|--------------------------------------------------------------------------
| Aquerii Role Taxonomy
|--------------------------------------------------------------------------
|
| Defines the system-wide generic role catalogue that every workspace can
| opt into. Three orthogonal dimensions:
|
|   departments — functional area an employee belongs to (5 options)
|   positions   — seniority / job level within a department (8 options)
|   tiers       — platform-level account tier (3 options)
|
| Each entry has a `slug` (used for the Spatie role name) and a `name`
| (human-readable display label). The Spatie role name uses the slug with
| a category prefix to keep it self-documenting in tooling:
|
|   employee-*   → department roles
|   pos-*        → position / job-level roles
|   superadmin-*, platform-admin, subscriber → tier roles
|
| All system roles are seeded with is_system = true and workspace_id = null,
| meaning they are available to every workspace but are not owned by one.
| Per-workspace custom roles should be created separately and will have
| is_system = false with workspace_id set.
|
*/

return [

    'departments' => [

        [
            'slug' => 'employee-operations',
            'name' => 'Operations',
            'description' => 'Day-to-day operational staff: production, logistics, supply chain, scheduling.',
        ],
        [
            'slug' => 'employee-safety',
            'name' => 'Safety / HSSE',
            'description' => 'Health, Safety, Security, and Environment personnel: incident response, audits, compliance.',
        ],
        [
            'slug' => 'employee-engineering',
            'name' => 'Engineering',
            'description' => 'Technical and engineering staff: design, maintenance, project engineering, reliability.',
        ],
        [
            'slug' => 'employee-finance-admin',
            'name' => 'Finance & Admin',
            'description' => 'Finance, accounting, HR, IT, and general administration personnel.',
        ],
        [
            'slug' => 'employee-contractors-visitors',
            'name' => 'Contractors & Visitors',
            'description' => 'External contractors, vendors, and visitors with temporary, scoped access.',
        ],

    ],

    'positions' => [

        [
            'slug' => 'pos-team-member',
            'name' => 'Team Member',
            'level' => 'L1',
            'description' => 'Individual contributor at the entry level; executes assigned tasks under supervision.',
        ],
        [
            'slug' => 'pos-senior',
            'name' => 'Senior',
            'level' => 'L3',
            'description' => 'Experienced individual contributor; works independently and mentors juniors.',
        ],
        [
            'slug' => 'pos-lead',
            'name' => 'Lead',
            'level' => 'L4',
            'description' => 'Subject-matter lead; coordinates a small team or workstream and owns delivery.',
        ],
        [
            'slug' => 'pos-supervisor',
            'name' => 'Supervisor',
            'level' => 'L5',
            'description' => 'Frontline supervisor; manages shift or squad performance, scheduling, and discipline.',
        ],
        [
            'slug' => 'pos-manager',
            'name' => 'Manager',
            'level' => 'L6',
            'description' => 'People and process manager; owns a function or department, hiring and budget.',
        ],
        [
            'slug' => 'pos-senior-manager',
            'name' => 'Senior Manager',
            'level' => 'L7',
            'description' => 'Senior people and process manager; manages multiple managers or a large function.',
        ],
        [
            'slug' => 'pos-director',
            'name' => 'Director',
            'level' => 'L8',
            'description' => 'Department or division director; sets strategy and reports to executive leadership.',
        ],
        [
            'slug' => 'pos-executive',
            'name' => 'Executive',
            'level' => 'L8+',
            'description' => 'C-suite or executive; owns company-wide strategy, P&L, and external representation.',
        ],

    ],

    'tiers' => [

        [
            'slug' => 'superadmin-creator',
            'name' => 'Superadmin Creator',
            'description' => 'Internal Aquerii staff: can create platform admins and provision new tenants.',
        ],
        [
            'slug' => 'platform-admin',
            'name' => 'Platform Admin',
            'description' => 'Aquerii platform-wide administrator: manages tenants, billing, and global settings.',
        ],
        [
            'slug' => 'subscriber',
            'name' => 'Subscriber',
            'description' => 'Workspace subscriber: the paying customer who owns and operates a tenant.',
        ],

    ],

];

# Phase 1 — Company Hierarchy & Employee Groups

## Objective
Implement the company owner → employee group hierarchy. Company owners can create employee accounts, assign them to groups, and manage their access. This is the "protocol observed" multi-tenant structure.

## Current State
Workspace members are flat — every member has a role string (`owner`, `admin`, `member`). No parent-child relationship. No company/employee distinction.

## Target State
```
Platform Owner (super-admin, sees all workspaces)
└── Company Owner (owns 1+ workspaces, pays bills, manages employees)
    ├── Admin (delegated workspace admin)
    ├── Manager / Project Manager (delegated per-project)
    │   └── Employee / Member (default role, belongs to employee group)
    └── Viewer (read-only, external)
```

## Data Model Changes

### workspace_members (enhanced)
- `company_id` (nullable UUID, FK to crm_companies)
- `employee_id` (nullable UUID — employee record if this person is an employee)
- `job_title`, `department`, `reports_to` (already partially in 000053 migration)
- `employee_group_id` (FK to new employee_groups table)

### New: employee_groups table
- `id`, `workspace_id`, `name`, `description`, `color`, `manager_id`, timestamps
- Groups represent departments: "Mining Operations", "Safety", "Admin", "Engineering"

### Companies Table Already Exists
`crm_companies` serves as the company entity. Add:
- `owner_id` (UUID, FK to users — which user owns this company account)
- `subscription_plan` (string, links to SubscriptionPlan enum)
- `tax_id`, `billing_email`, `billing_address`
- `employee_count` (cached, updated on employee add/remove)

## Tasks

### 1.1 — Company Ownership Model
- Add owner_id to crm_companies
- Create `CompanyController@register` — company signup with plan selection
- Link user to owned companies
- Add `is_owner` scope on workspace_members

### 1.2 — Employee Groups CRUD
- Migration: `create_employee_groups_table`
- API: `/workspaces/{ws}/employee-groups` (CRUD)
- Frontend: EmployeeGroups page under Settings > Team
- Components: GroupList, GroupForm, GroupCard

### 1.3 — Invite with Employee Role
- Update `WorkspaceInvitationController` to support `role` + `employee_group_id`
- When a company owner invites, they assign role + group
- Auto-create the user if not existing (with password-set flow)

### 1.4 — Employee Dashboard
- Employees see: their tasks, their groups, their timesheets
- Employee-level API endpoints filtered by `employee_id`
- Frontend: EmployeePortal page under /app

### 1.5 — Reports-To Hierarchy
- Add `reports_to` field on workspace_members
- Org chart view: `/workspaces/{ws}/org-chart`
- Manager sees subordinates' tasks, timesheets, leave requests

## Files Modified
- `app/Models/Workspace.php` (employee_groups relationship)
- `app/Models/WorkspaceMember.php` (employee_group_id, reports_to)
- `app/Modules/CRM/Models/CrmCompany.php` (owner_id, subscription fields)
- `app/Modules/CRM/Http/Controllers/CompanyController.php`
- `database/migrations/` (employee_groups, ws_member enhancements)
- `routes/api.php` (employee group routes)
- Frontend: `src/pages/employees/`, `src/components/settings/`

## CI Gate
```bash
php artisan test --testsuite=Feature --filter="Workspace|Invite"
```

## Commit Message
`feat(rbac): add company ownership, employee groups, and role hierarchy`

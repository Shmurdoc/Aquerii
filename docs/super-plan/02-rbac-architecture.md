# 02 — RBAC Architecture

**Project:** Aquerii  
**Version:** 1.0  
**Date:** 2026-05-25  
**Status:** Implementation-Ready

---

## Table of Contents

1. [Overview & Design Principles](#1-overview--design-principles)
2. [Role Definitions](#2-role-definitions)
3. [Permission Matrix](#3-permission-matrix)
4. [Hierarchical Workspace Model](#4-hierarchical-workspace-model)
5. [Laravel Implementation Plan](#5-laravel-implementation-plan)
6. [Row-Level Security & Data Isolation](#6-row-level-security--data-isolation)
7. [Employee-Specific Restrictions](#7-employee-specific-restrictions)
8. [Manager Capabilities](#8-manager-capabilities)
9. [Guest / Viewer Access](#9-guest--viewer-access)
10. [API Route → Policy Mapping](#10-api-route--policy-mapping)
11. [Frontend Enforcement](#11-frontend-enforcement)
12. [Audit Trail Requirements](#12-audit-trail-requirements)
13. [Migration Plan](#13-migration-plan)

---

## 1. Overview & Design Principles

Aquerii is a multi-tenant SaaS platform. Every piece of data belongs to a **workspace**. Authorization is always evaluated against two axes:

1. **Who** — the authenticated user's role within that workspace (`workspace_members.role`)
2. **What** — the resource being acted upon and whether it belongs to the same workspace

### Role Hierarchy (high to low)

```
Platform Owner (SaaS-level, cross-workspace)
       │
  Company Owner  (workspace root, maps to frontend role: owner)
       │
    Admin         (maps to frontend role: admin)
       │
   Manager        (maps to frontend role: manager)
       │
   Employee/Member (maps to frontend role: member)
       │
    Viewer        (maps to frontend role: viewer)
```

### Core Principles

- **Deny by default.** Every gate returns `false` unless an explicit rule grants access.
- **Workspace isolation is non-negotiable.** No query may cross workspace boundaries without Platform Owner privilege.
- **Role stored once.** `workspace_members.role` is the single source of truth. No duplicate role columns.
- **Policies, not inline checks.** All authorization logic lives in Laravel Policy classes; controllers never call `Auth::user()->role` directly.
- **Audit everything destructive.** Delete, approve, export, and all financial mutations are logged.
- **Frontend reflects, not enforces.** React conditionally renders based on role, but the API is the enforcement boundary.

---

## 2. Role Definitions

### 2.1 Platform Owner

The SaaS operator. Exists outside any single workspace. Can impersonate any workspace for support purposes. Never appears in a workspace's `workspace_members` table — identified instead by `users.is_platform_owner = true`.

**Real-world context:** The Aquerii engineering/operations team. Has access to a `/platform-admin` dashboard showing all tenants, billing health, and system metrics.

**Capabilities:**
- Create, suspend, and delete workspaces
- Impersonate any workspace owner for support
- View cross-workspace analytics
- Manage subscription plans and pricing
- Access audit logs across all workspaces

### 2.2 Company Owner (`owner`)

The person who created the workspace or was explicitly granted ownership. Typically the CEO, CTO, or IT Admin of the subscribing company. There is exactly **one** owner per workspace (enforced at DB level).

**Real-world context:** "I set up Aquerii for our company. I control billing, invite people, and can see everything."

**Capabilities:**
- Full CRUD on all modules
- Transfer ownership
- Manage billing and subscription
- Invite / remove any member
- Set workspace-wide settings
- Export any data
- View all financial, HR, and salary information

### 2.3 Admin (`admin`)

A trusted manager-level person with near-owner capabilities, but cannot touch billing or transfer ownership. Typically an Operations Manager, HR Director, or IT Manager.

**Real-world context:** "I manage the platform day-to-day. I can configure everything except cancel the subscription."

**Capabilities:**
- Full CRUD on all modules except Billing
- Invite / remove members (cannot remove owner)
- Approve leave, expenses, purchase orders
- Export all data
- View all salary and financial data

### 2.4 Manager (`manager`)

A team lead or department head. Scoped to their team's data by default. Can approve HR requests for direct reports only.

**Real-world context:** "I manage my team's projects, approve their leave, and see their performance — but I don't touch payroll or company-wide settings."

**Capabilities:**
- Full CRUD on Boards & Items within assigned workspaces/boards
- Read CRM (cannot delete deals belonging to other managers)
- Read/Write HR for their direct reports only
- Approve leave and expense requests from their team
- View team-level reports (not company-wide financials)
- Cannot access Billing or ERP accounting

### 2.5 Member / Employee (`member`)

A regular employee. The most common role. Highly scoped — self-service only for HR.

**Real-world context:** "I work on my assigned tasks, log my time, submit leave requests, and upload receipts."

**Capabilities:**
- Read/Write on Boards & Items they are assigned to
- Read their own CRM contacts if assigned
- Submit (create) their own leave, attendance, expense records
- Read their own HR data (payslips, attendance history)
- Cannot see other employees' salaries or HR data
- Cannot access ERP accounting, Billing, or company Reports

### 2.6 Viewer (`viewer`)

A read-only observer. Typically an external auditor, a client given limited visibility, or a stakeholder who needs to monitor without acting.

**Real-world context:** "I can see the board status and approved documents, but I cannot create, edit, or delete anything."

**Capabilities:**
- Read-only on explicitly shared Boards, CRM pipelines, Documents
- Cannot see salary data, financial line items, or HR details
- Cannot export data
- Cannot trigger automations

---

## 3. Permission Matrix

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Allowed |
| ❌ | Denied |
| 🔒 | Own records only |
| 👥 | Direct reports only |
| 📋 | Read-only |
| 💰 | Excludes salary / financial fields |

Actions: **C** = Create, **R** = Read, **U** = Update, **D** = Delete, **A** = Approve, **E** = Export

---

### 3.1 Workspace & Settings

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| View workspace settings | ✅ | ✅ | ✅ | 📋 | ❌ | ❌ |
| Edit workspace profile | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ✅ (non-owner) | ❌ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ✅ (below admin) | ❌ | ❌ | ❌ |
| Transfer ownership | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure integrations | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete workspace | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### 3.2 Boards & Items

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create board | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Read board | ✅ | ✅ | ✅ | ✅ | 🔒 assigned | 📋 shared |
| Update board settings | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Delete board | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Create item | ✅ | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| Read item | ✅ | ✅ | ✅ | ✅ | 🔒 assigned | 📋 shared |
| Update item | ✅ | ✅ | ✅ | ✅ | 🔒 assigned | ❌ |
| Delete item | ✅ | ✅ | ✅ | ✅ (own board) | ❌ | ❌ |
| Assign item to user | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Comment on item | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export board | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage board groups | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage board columns | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 3.3 CRM — Pipelines

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create pipeline | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Read pipeline | ✅ | ✅ | ✅ | ✅ | ✅ | 📋 |
| Update pipeline | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete pipeline | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create deal | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read deal | ✅ | ✅ | ✅ | ✅ | 🔒 assigned | 📋 |
| Update deal | ✅ | ✅ | ✅ | ✅ | 🔒 assigned | ❌ |
| Delete deal | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Create contact | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read contact | ✅ | ✅ | ✅ | ✅ | ✅ | 📋 |
| Update contact | ✅ | ✅ | ✅ | ✅ | 🔒 assigned | ❌ |
| Delete contact | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create company | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read company | ✅ | ✅ | ✅ | ✅ | ✅ | 📋 |
| Update company | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete company | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export CRM | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 3.4 ERP — Invoicing

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Read invoice | ✅ | ✅ | ✅ | 📋 | ❌ | ❌ |
| Update invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Send invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark invoice paid | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export invoices | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

### 3.5 ERP — Purchase Orders (POs)

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create PO | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Read PO | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update PO | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Delete PO | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve PO | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export POs | ✅ | ✅ | ✅ | 📋 | ❌ | ❌ |

---

### 3.6 ERP — Sales Orders (SOs)

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create SO | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Read SO | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update SO | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Delete SO | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve SO | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export SOs | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 3.7 ERP — Inventory

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create product | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Read product | ✅ | ✅ | ✅ | ✅ | 📋 | ❌ |
| Update product | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete product | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Adjust stock | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export inventory | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 3.8 ERP — Accounting

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| View chart of accounts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create journal entry | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View P&L / Balance Sheet | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export financial reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reconcile transactions | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

### 3.9 HR — Employees

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create employee record | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Read all employee records | ✅ | ✅ | ✅ | 💰 team only | ❌ | ❌ |
| Read own employee record | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update employee record | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete employee record | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View salary information | ✅ | ✅ | ✅ | ❌ | 🔒 own only | ❌ |
| Export HR data | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

### 3.10 HR — Attendance

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Record attendance | ✅ | ✅ | ✅ | ✅ | 🔒 own | ❌ |
| Read all attendance | ✅ | ✅ | ✅ | 👥 team | ❌ | ❌ |
| Read own attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit attendance record | ✅ | ✅ | ✅ | 👥 team | ❌ | ❌ |
| Delete attendance record | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export attendance | ✅ | ✅ | ✅ | 👥 team | ❌ | ❌ |

---

### 3.11 HR — Leave

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Submit leave request | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read all leave requests | ✅ | ✅ | ✅ | 👥 team | ❌ | ❌ |
| Read own leave requests | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve / decline leave | ✅ | ✅ | ✅ | 👥 team | ❌ | ❌ |
| Cancel own leave | ✅ | ✅ | ✅ | ✅ | ✅ (pending) | ❌ |
| Configure leave types | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export leave data | ✅ | ✅ | ✅ | 👥 team | ❌ | ❌ |

---

### 3.12 HR — Expenses

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Submit expense | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read all expenses | ✅ | ✅ | ✅ | 👥 team | ❌ | ❌ |
| Read own expenses | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve / decline expense | ✅ | ✅ | ✅ | 👥 team | ❌ | ❌ |
| Delete expense | ✅ | ✅ | ✅ | ❌ | 🔒 draft only | ❌ |
| Export expenses | ✅ | ✅ | ✅ | 👥 team | ❌ | ❌ |

---

### 3.13 Meetings

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create meeting | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read meeting | ✅ | ✅ | ✅ | ✅ | 🔒 invited | 📋 shared |
| Update meeting | ✅ | ✅ | ✅ | 🔒 own | 🔒 own | ❌ |
| Delete meeting | ✅ | ✅ | ✅ | 🔒 own | 🔒 own | ❌ |
| Invite participants | ✅ | ✅ | ✅ | ✅ | 🔒 own | ❌ |
| Export meeting notes | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

### 3.14 Documents & AI

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create document | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read document | ✅ | ✅ | ✅ | ✅ | 🔒 shared | 📋 shared |
| Update document | ✅ | ✅ | ✅ | ✅ | 🔒 own | ❌ |
| Delete document | ✅ | ✅ | ✅ | ✅ (own/team) | 🔒 own | ❌ |
| Share document | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Use AI features | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export document | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

### 3.15 Automations

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| Create automation | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Read automation | ✅ | ✅ | ✅ | ✅ | 📋 own board | ❌ |
| Update automation | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Delete automation | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Enable / disable | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| View automation logs | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ |

---

### 3.16 Reports & Analytics

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| View company-wide reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View financial reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View team reports | ✅ | ✅ | ✅ | 👥 own team | ❌ | ❌ |
| View own performance | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create custom report | ✅ | ✅ | ✅ | ✅ (team scope) | ❌ | ❌ |
| Export reports | ✅ | ✅ | ✅ | ✅ (team scope) | ❌ | ❌ |
| Schedule report delivery | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

### 3.17 Billing

| Feature | Platform Owner | Owner | Admin | Manager | Member | Viewer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| View subscription | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upgrade / downgrade plan | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update payment method | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View invoices | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cancel subscription | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Hierarchical Workspace Model

### 4.1 Platform Owner vs Company Owner

```
┌──────────────────────────────────────────────────────┐
│                   PLATFORM LAYER                      │
│  users.is_platform_owner = true                       │
│  No workspace_members row needed                      │
│  Can access /platform-admin/* routes                  │
│  Sees all workspaces in read mode                     │
│  Can impersonate (creates audit log entry)            │
└──────────────────────┬───────────────────────────────┘
                       │  1 : N
┌──────────────────────▼───────────────────────────────┐
│                  WORKSPACE LAYER                      │
│  workspaces table (id, name, slug, plan, owner_id)    │
│                                                       │
│  workspace_members                                    │
│  ├─ user_id (FK users)                                │
│  ├─ workspace_id (FK workspaces)                      │
│  ├─ role  ENUM(owner|admin|manager|member|viewer)     │
│  └─ manager_id (nullable, FK users — direct reports) │
│                                                       │
│  Exactly ONE member per workspace with role = owner   │
│  (enforced by partial unique index)                   │
└──────────────────────────────────────────────────────┘
```

### 4.2 Multi-Workspace Membership

A single `users` row may appear in multiple `workspace_members` rows with different roles in each workspace. For example, a consultant might be a `manager` in Workspace A and a `viewer` in Workspace B.

**Resolved at runtime:**
```php
// Request must carry workspace context (subdomain or header)
$role = WorkspaceMember::where('user_id', Auth::id())
    ->where('workspace_id', $request->workspace()->id)
    ->value('role');
```

### 4.3 Workspace Resolution Middleware

```php
// app/Http/Middleware/ResolveWorkspace.php
class ResolveWorkspace
{
    public function handle(Request $request, Closure $next)
    {
        $slug = $request->route('workspace')
            ?? $request->header('X-Workspace-Slug')
            ?? explode('.', $request->getHost())[0];

        $workspace = Workspace::where('slug', $slug)->firstOrFail();
        $request->setWorkspace($workspace);

        // Inject membership into the request bag for policies
        $request->setWorkspaceMember(
            WorkspaceMember::where('user_id', Auth::id())
                ->where('workspace_id', $workspace->id)
                ->firstOrFail() // 403 if not a member
        );

        return $next($request);
    }
}
```

### 4.4 Workspace Scoping Trait

All Eloquent models that belong to a workspace use this trait to automatically scope queries:

```php
// app/Models/Concerns/BelongsToWorkspace.php
trait BelongsToWorkspace
{
    protected static function bootBelongsToWorkspace(): void
    {
        static::addGlobalScope('workspace', function (Builder $builder) {
            if ($workspace = request()->workspace()) {
                $builder->where(
                    $builder->getModel()->getTable() . '.workspace_id',
                    $workspace->id
                );
            }
        });

        static::creating(function (Model $model) {
            $model->workspace_id ??= request()->workspace()?->id;
        });
    }
}
```

---

## 5. Laravel Implementation Plan

### 5.1 Directory Structure

```
app/
├── Http/
│   ├── Middleware/
│   │   ├── ResolveWorkspace.php
│   │   ├── RequireWorkspaceMembership.php
│   │   ├── EnforceWorkspaceRole.php
│   │   └── PlatformOwnerOnly.php
│   └── Controllers/
│       └── (domain controllers)
├── Policies/
│   ├── BoardPolicy.php
│   ├── ItemPolicy.php
│   ├── DealPolicy.php
│   ├── ContactPolicy.php
│   ├── CrmCompanyPolicy.php
│   ├── InvoicePolicy.php
│   ├── PurchaseOrderPolicy.php
│   ├── SalesOrderPolicy.php
│   ├── ProductPolicy.php
│   ├── EmployeePolicy.php
│   ├── AttendancePolicy.php
│   ├── LeaveRequestPolicy.php
│   ├── ExpensePolicy.php
│   ├── MeetingPolicy.php
│   ├── DocumentPolicy.php
│   ├── AutomationPolicy.php
│   ├── ReportPolicy.php
│   ├── BillingPolicy.php
│   └── WorkspaceSettingsPolicy.php
├── Models/
│   ├── WorkspaceMember.php
│   └── Concerns/
│       └── BelongsToWorkspace.php
└── Services/
    └── RoleService.php
```

### 5.2 Role Service

```php
// app/Services/RoleService.php
class RoleService
{
    const ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'];
    const ROLE_WEIGHTS = [
        'owner'   => 100,
        'admin'   => 80,
        'manager' => 60,
        'member'  => 40,
        'viewer'  => 20,
    ];

    public function hasRole(User $user, string $role, Workspace $workspace): bool
    {
        return WorkspaceMember::where('user_id', $user->id)
            ->where('workspace_id', $workspace->id)
            ->where('role', $role)
            ->exists();
    }

    public function hasMinRole(User $user, string $minRole, Workspace $workspace): bool
    {
        $member = WorkspaceMember::where('user_id', $user->id)
            ->where('workspace_id', $workspace->id)
            ->first();

        if (!$member) return false;

        return self::ROLE_WEIGHTS[$member->role] >= self::ROLE_WEIGHTS[$minRole];
    }

    public function isDirectReport(User $manager, User $employee, Workspace $workspace): bool
    {
        return WorkspaceMember::where('user_id', $employee->id)
            ->where('workspace_id', $workspace->id)
            ->where('manager_id', $manager->id)
            ->exists();
    }

    public function isPlatformOwner(User $user): bool
    {
        return (bool) $user->is_platform_owner;
    }
}
```

### 5.3 Base Policy

All policies extend this base to inherit workspace resolution and role helpers:

```php
// app/Policies/BasePolicy.php
abstract class BasePolicy
{
    protected RoleService $roles;

    public function __construct(RoleService $roles)
    {
        $this->roles = $roles;
    }

    protected function workspace(): Workspace
    {
        return request()->workspace();
    }

    protected function memberRole(User $user): ?string
    {
        return WorkspaceMember::where('user_id', $user->id)
            ->where('workspace_id', $this->workspace()->id)
            ->value('role');
    }

    protected function atLeast(User $user, string $role): bool
    {
        return $this->roles->hasMinRole($user, $role, $this->workspace());
    }

    protected function isOwnerOrAdmin(User $user): bool
    {
        return $this->atLeast($user, 'admin');
    }

    // Platform owners bypass all workspace policies
    public function before(User $user, string $ability): ?bool
    {
        if ($this->roles->isPlatformOwner($user)) {
            return true;
        }
        return null; // continue to specific method
    }
}
```

### 5.4 Example Policies

#### LeaveRequestPolicy

```php
class LeaveRequestPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->atLeast($user, 'member');
    }

    public function view(User $user, LeaveRequest $leave): bool
    {
        // Member can see their own; manager sees team; admin/owner sees all
        if ($this->atLeast($user, 'admin')) return true;
        if ($this->atLeast($user, 'manager')) {
            return $this->roles->isDirectReport($user, $leave->employee, $this->workspace())
                || $leave->user_id === $user->id;
        }
        return $leave->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $this->atLeast($user, 'member');
    }

    public function update(User $user, LeaveRequest $leave): bool
    {
        // Only own pending requests
        return $leave->user_id === $user->id && $leave->status === 'pending';
    }

    public function delete(User $user, LeaveRequest $leave): bool
    {
        return $this->isOwnerOrAdmin($user);
    }

    public function approve(User $user, LeaveRequest $leave): bool
    {
        if ($this->isOwnerOrAdmin($user)) return true;
        if ($this->memberRole($user) === 'manager') {
            return $this->roles->isDirectReport($user, $leave->employee, $this->workspace());
        }
        return false;
    }

    public function export(User $user): bool
    {
        return $this->atLeast($user, 'manager');
    }
}
```

#### BoardPolicy

```php
class BoardPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->atLeast($user, 'viewer');
    }

    public function view(User $user, Board $board): bool
    {
        if ($this->atLeast($user, 'manager')) return true;
        // Members see boards they are assigned to
        return $board->members()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $this->atLeast($user, 'manager');
    }

    public function update(User $user, Board $board): bool
    {
        if ($this->isOwnerOrAdmin($user)) return true;
        if ($this->memberRole($user) === 'manager') {
            return $board->created_by === $user->id;
        }
        return false;
    }

    public function delete(User $user, Board $board): bool
    {
        return $this->update($user, $board);
    }

    public function export(User $user, Board $board): bool
    {
        if ($this->isOwnerOrAdmin($user)) return true;
        return $this->memberRole($user) === 'manager';
    }
}
```

### 5.5 Registering Policies

```php
// app/Providers/AuthServiceProvider.php
protected $policies = [
    Board::class           => BoardPolicy::class,
    Item::class            => ItemPolicy::class,
    Deal::class            => DealPolicy::class,
    Contact::class         => ContactPolicy::class,
    CrmCompany::class      => CrmCompanyPolicy::class,
    Invoice::class         => InvoicePolicy::class,
    PurchaseOrder::class   => PurchaseOrderPolicy::class,
    SalesOrder::class      => SalesOrderPolicy::class,
    Product::class         => ProductPolicy::class,
    Employee::class        => EmployeePolicy::class,
    Attendance::class      => AttendancePolicy::class,
    LeaveRequest::class    => LeaveRequestPolicy::class,
    Expense::class         => ExpensePolicy::class,
    Meeting::class         => MeetingPolicy::class,
    Document::class        => DocumentPolicy::class,
    Automation::class      => AutomationPolicy::class,
    Report::class          => ReportPolicy::class,
    Workspace::class       => WorkspaceSettingsPolicy::class,
];
```

### 5.6 Controller Usage Pattern

```php
// app/Http/Controllers/LeaveRequestController.php
class LeaveRequestController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', LeaveRequest::class);

        $query = LeaveRequest::query();

        // Scope automatically applied based on role
        $role = $request->workspaceMember()->role;
        if ($role === 'member') {
            $query->where('user_id', Auth::id());
        } elseif ($role === 'manager') {
            $query->whereIn('user_id', Auth::user()->directReports->pluck('id'))
                  ->orWhere('user_id', Auth::id());
        }
        // admin/owner get all (global workspace scope already applied)

        return LeaveRequestResource::collection($query->paginate());
    }

    public function approve(Request $request, LeaveRequest $leave)
    {
        $this->authorize('approve', $leave);

        $leave->update(['status' => 'approved', 'approved_by' => Auth::id()]);

        AuditLog::record('leave_request.approved', $leave);

        return new LeaveRequestResource($leave);
    }
}
```

### 5.7 Gates for Non-Model Permissions

For permissions not tied to a specific model instance (e.g., accessing the billing page):

```php
// app/Providers/AuthServiceProvider.php — boot()
Gate::define('access-billing', function (User $user) {
    return app(RoleService::class)->atLeast($user, 'owner', request()->workspace());
});

Gate::define('access-erp-accounting', function (User $user) {
    return app(RoleService::class)->atLeast($user, 'admin', request()->workspace());
});

Gate::define('access-platform-admin', function (User $user) {
    return $user->is_platform_owner;
});

Gate::define('view-salary-data', function (User $user, Employee $employee) {
    if (app(RoleService::class)->atLeast($user, 'admin', request()->workspace())) return true;
    return $employee->user_id === $user->id;
});
```

### 5.8 Middleware Stack

```php
// routes/api.php
Route::middleware([
    'auth:sanctum',
    ResolveWorkspace::class,
    RequireWorkspaceMembership::class,
])->prefix('{workspace}')->group(function () {

    // Platform admin routes
    Route::middleware(PlatformOwnerOnly::class)
        ->prefix('platform')
        ->group(base_path('routes/platform.php'));

    // Workspace routes
    Route::group([], base_path('routes/workspace.php'));
});
```

---

## 6. Row-Level Security & Data Isolation

### 6.1 Application-Layer Scoping (Primary)

The `BelongsToWorkspace` trait (see §4.4) applies a global Eloquent scope to every model. This is the primary isolation mechanism.

**Important:** Raw DB queries and joins must explicitly include `workspace_id` filters:

```php
// UNSAFE — never do this in a multi-tenant context
$deals = DB::table('deals')->get();

// SAFE
$deals = DB::table('deals')
    ->where('workspace_id', request()->workspace()->id)
    ->get();
```

### 6.2 PostgreSQL RLS (Defense-in-Depth)

As a second defense layer, enable RLS on sensitive tables. This prevents a compromised application layer from leaking cross-tenant data.

```sql
-- Enable RLS on the deals table
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals FORCE ROW LEVEL SECURITY;

-- Create a policy that uses the app-set session variable
CREATE POLICY workspace_isolation ON deals
    USING (workspace_id = current_setting('app.current_workspace_id')::uuid);

-- Laravel DB connection must set the variable after connecting
-- app/Providers/AppServiceProvider.php
DB::listen(function ($query) {
    // Set on each connection
});

-- Better: Set in a middleware after workspace resolution
DB::statement(
    "SET app.current_workspace_id = ?",
    [$workspace->id]
);
```

Apply RLS to these high-sensitivity tables:

| Table | RLS Required |
|-------|:--:|
| `deals` | ✅ |
| `invoices` | ✅ |
| `purchase_orders` | ✅ |
| `employees` | ✅ |
| `leave_requests` | ✅ |
| `expenses` | ✅ |
| `salary_records` | ✅ |
| `audit_logs` | ✅ |
| `documents` | ✅ |

### 6.3 Scope on Queries with Relationships

When eager-loading, ensure nested relationships are also scoped:

```php
// Correct — workspace scope applied to nested eager loads
$boards = Board::with([
    'items' => fn($q) => $q->whereHas('board', fn($q2) =>
        $q2->where('workspace_id', request()->workspace()->id)
    ),
])->get();
```

### 6.4 Export Scoping

All export jobs must receive the `workspace_id` as a constructor argument and never rely solely on the request context (jobs run async):

```php
class ExportLeaveRequestsJob implements ShouldQueue
{
    public function __construct(
        public readonly string $workspaceId,
        public readonly string $requestingUserId,
        public readonly string $requestingUserRole,
    ) {}

    public function handle(): void
    {
        $query = LeaveRequest::withoutGlobalScopes()
            ->where('workspace_id', $this->workspaceId);

        if ($this->requestingUserRole === 'manager') {
            $directReportIds = WorkspaceMember::where('manager_id', $this->requestingUserId)
                ->where('workspace_id', $this->workspaceId)
                ->pluck('user_id');
            $query->whereIn('user_id', $directReportIds);
        }

        // ... generate CSV
    }
}
```

---

## 7. Employee-Specific Restrictions

### 7.1 Own-Record Scoping

Employees (`member` role) are strictly scoped to their own records across HR modules. This is enforced at multiple levels:

1. **Policy** — `LeaveRequestPolicy::view()` checks `$leave->user_id === $user->id`
2. **Controller** — `where('user_id', Auth::id())` in query
3. **API resource** — sensitive fields stripped in `EmployeeResource`

### 7.2 Sensitive Field Exclusion

```php
// app/Http/Resources/EmployeeResource.php
class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $member = $request->workspaceMember();
        $isSelf = $this->user_id === $request->user()->id;
        $canViewSalary = in_array($member->role, ['owner', 'admin']) || $isSelf;

        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'email'       => $this->email,
            'department'  => $this->department,
            'job_title'   => $this->job_title,
            'start_date'  => $this->start_date,
            // Salary only visible to self, admin, owner
            'salary'      => $canViewSalary ? $this->salary : null,
            'salary_currency' => $canViewSalary ? $this->salary_currency : null,
            // Bank details — self or owner only
            'bank_account'    => ($isSelf || $member->role === 'owner') ? $this->bank_account : null,
        ];
    }
}
```

### 7.3 Leave Balance Visibility

Employees can see their own leave balance but not others':

```php
// LeaveBalanceController
public function show(Request $request, User $targetUser)
{
    $this->authorize('view', [LeaveBalance::class, $targetUser]);
    // Policy: member sees self only, manager sees team, admin sees all
    $balance = LeaveBalance::where('user_id', $targetUser->id)
        ->where('workspace_id', $request->workspace()->id)
        ->firstOrFail();

    return new LeaveBalanceResource($balance);
}
```

### 7.4 Attendance Clock-In/Out

Members can only record their own attendance. The controller ignores any `user_id` in the request body and always uses `Auth::id()`:

```php
public function store(Request $request)
{
    $this->authorize('create', Attendance::class);

    // Force own user_id regardless of what was submitted
    $attendance = Attendance::create([
        'user_id'      => Auth::id(), // not $request->user_id
        'workspace_id' => $request->workspace()->id,
        'clock_in'     => now(),
    ]);

    return new AttendanceResource($attendance);
}
```

---

## 8. Manager Capabilities

### 8.1 Direct Reports Definition

A manager's scope is defined by `workspace_members.manager_id`. Every member row optionally points to a manager:

```sql
-- workspace_members
ALTER TABLE workspace_members
    ADD COLUMN manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
```

### 8.2 Team-Scoped Queries

```php
// Reusable scope in WorkspaceMember model
public function scopeDirectReports(Builder $query, User $manager, Workspace $workspace): Builder
{
    return $query
        ->where('workspace_id', $workspace->id)
        ->where('manager_id', $manager->id);
}

// Usage in AttendanceController
$teamIds = WorkspaceMember::directReports(Auth::user(), request()->workspace())
    ->pluck('user_id');

$attendance = Attendance::whereIn('user_id', $teamIds)->paginate();
```

### 8.3 Approval Workflow

Leave and expense approval flows use a status machine:

```
pending → approved
pending → declined
approved → pending  (only admin/owner can revert)
```

```php
// ExpensePolicy
public function approve(User $user, Expense $expense): bool
{
    if ($expense->status !== 'pending') return false;
    if ($this->isOwnerOrAdmin($user)) return true;
    if ($this->memberRole($user) !== 'manager') return false;

    return $this->roles->isDirectReport($user, $expense->submitter, $this->workspace());
}
```

### 8.4 Manager Report Access

Managers can access team-level reports scoped to their direct reports:

```php
// ReportPolicy
public function viewTeamReport(User $user): bool
{
    return $this->atLeast($user, 'manager');
}

public function viewCompanyReport(User $user): bool
{
    return $this->isOwnerOrAdmin($user);
}

public function viewFinancialReport(User $user): bool
{
    return $this->isOwnerOrAdmin($user);
}
```

---

## 9. Guest / Viewer Access

### 9.1 Read-Only Enforcement

Viewers are granted `viewAny` and `view` in specific policies but never `create`, `update`, `delete`, `approve`, or `export`.

The `BasePolicy::before()` does **not** grant viewer extra access — they are explicitly listed only where read is allowed.

### 9.2 Field Exclusions for Viewers

```php
// app/Http/Resources/DealResource.php
public function toArray(Request $request): array
{
    $role = $request->workspaceMember()?->role ?? 'viewer';
    $canViewFinancials = in_array($role, ['owner', 'admin', 'manager']);

    return [
        'id'          => $this->id,
        'title'       => $this->title,
        'stage'       => $this->stage,
        'assigned_to' => $this->assigned_to,
        // Financial fields hidden from viewers
        'value'       => $canViewFinancials ? $this->value : null,
        'margin'      => $canViewFinancials ? $this->margin : null,
        'cost'        => $canViewFinancials ? $this->cost : null,
    ];
}
```

### 9.3 Viewer-Accessible Routes

Viewers can only hit these route groups:

| Route Group | Viewer Access |
|---|---|
| `GET /boards` (shared) | ✅ |
| `GET /boards/{id}/items` | ✅ (shared boards only) |
| `GET /crm/contacts` | ✅ (read-only, no financials) |
| `GET /documents` (shared) | ✅ |
| `GET /meetings` (shared) | ✅ |
| All POST / PUT / DELETE routes | ❌ |
| HR routes | ❌ |
| ERP routes | ❌ |
| Billing routes | ❌ |
| Reports routes | ❌ |

### 9.4 Viewer Invite Flow

Viewers are invited with an explicit `role=viewer` parameter. The invitation email makes the read-only nature clear. Viewers cannot invite others.

---

## 10. API Route → Policy Mapping

### 10.1 Workspace & Settings Routes

| Method | Route | Controller@Method | Policy Gate |
|--------|-------|-------------------|-------------|
| GET | `/workspaces/{ws}` | `WorkspaceController@show` | `view` on `Workspace` |
| PUT | `/workspaces/{ws}` | `WorkspaceController@update` | `update` on `Workspace` |
| DELETE | `/workspaces/{ws}` | `WorkspaceController@destroy` | `delete` on `Workspace` |
| GET | `/workspaces/{ws}/members` | `MemberController@index` | `viewMembers` on `Workspace` |
| POST | `/workspaces/{ws}/members` | `MemberController@store` | `inviteMembers` on `Workspace` |
| PUT | `/workspaces/{ws}/members/{member}` | `MemberController@update` | `updateMember` on `Workspace` |
| DELETE | `/workspaces/{ws}/members/{member}` | `MemberController@destroy` | `removeMember` on `Workspace` |

### 10.2 Boards & Items Routes

| Method | Route | Controller@Method | Policy Gate |
|--------|-------|-------------------|-------------|
| GET | `/boards` | `BoardController@index` | `viewAny` on `Board` |
| POST | `/boards` | `BoardController@store` | `create` on `Board` |
| GET | `/boards/{board}` | `BoardController@show` | `view` on `Board` |
| PUT | `/boards/{board}` | `BoardController@update` | `update` on `Board` |
| DELETE | `/boards/{board}` | `BoardController@destroy` | `delete` on `Board` |
| GET | `/boards/{board}/export` | `BoardController@export` | `export` on `Board` |
| GET | `/boards/{board}/items` | `ItemController@index` | `viewAny` on `Item` |
| POST | `/boards/{board}/items` | `ItemController@store` | `create` on `Item` |
| GET | `/items/{item}` | `ItemController@show` | `view` on `Item` |
| PUT | `/items/{item}` | `ItemController@update` | `update` on `Item` |
| DELETE | `/items/{item}` | `ItemController@destroy` | `delete` on `Item` |
| POST | `/items/{item}/assign` | `ItemController@assign` | `assign` on `Item` |
| POST | `/items/{item}/comments` | `CommentController@store` | `comment` on `Item` |

### 10.3 CRM Routes

| Method | Route | Controller@Method | Policy Gate |
|--------|-------|-------------------|-------------|
| GET | `/crm/pipelines` | `PipelineController@index` | `viewAny` on `Pipeline` |
| POST | `/crm/pipelines` | `PipelineController@store` | `create` on `Pipeline` |
| GET | `/crm/pipelines/{pipeline}` | `PipelineController@show` | `view` on `Pipeline` |
| PUT | `/crm/pipelines/{pipeline}` | `PipelineController@update` | `update` on `Pipeline` |
| DELETE | `/crm/pipelines/{pipeline}` | `PipelineController@destroy` | `delete` on `Pipeline` |
| GET | `/crm/deals` | `DealController@index` | `viewAny` on `Deal` |
| POST | `/crm/deals` | `DealController@store` | `create` on `Deal` |
| GET | `/crm/deals/{deal}` | `DealController@show` | `view` on `Deal` |
| PUT | `/crm/deals/{deal}` | `DealController@update` | `update` on `Deal` |
| DELETE | `/crm/deals/{deal}` | `DealController@destroy` | `delete` on `Deal` |
| GET | `/crm/contacts` | `ContactController@index` | `viewAny` on `Contact` |
| POST | `/crm/contacts` | `ContactController@store` | `create` on `Contact` |
| GET | `/crm/contacts/{contact}` | `ContactController@show` | `view` on `Contact` |
| PUT | `/crm/contacts/{contact}` | `ContactController@update` | `update` on `Contact` |
| DELETE | `/crm/contacts/{contact}` | `ContactController@destroy` | `delete` on `Contact` |
| GET | `/crm/companies` | `CrmCompanyController@index` | `viewAny` on `CrmCompany` |
| POST | `/crm/companies` | `CrmCompanyController@store` | `create` on `CrmCompany` |
| PUT | `/crm/companies/{company}` | `CrmCompanyController@update` | `update` on `CrmCompany` |
| DELETE | `/crm/companies/{company}` | `CrmCompanyController@destroy` | `delete` on `CrmCompany` |
| GET | `/crm/export` | `CrmExportController@export` | `export` Gate `crm.export` |

### 10.4 ERP Routes

| Method | Route | Controller@Method | Policy Gate |
|--------|-------|-------------------|-------------|
| GET | `/erp/invoices` | `InvoiceController@index` | `viewAny` on `Invoice` |
| POST | `/erp/invoices` | `InvoiceController@store` | `create` on `Invoice` |
| GET | `/erp/invoices/{invoice}` | `InvoiceController@show` | `view` on `Invoice` |
| PUT | `/erp/invoices/{invoice}` | `InvoiceController@update` | `update` on `Invoice` |
| DELETE | `/erp/invoices/{invoice}` | `InvoiceController@destroy` | `delete` on `Invoice` |
| POST | `/erp/invoices/{invoice}/send` | `InvoiceController@send` | `send` on `Invoice` |
| POST | `/erp/invoices/{invoice}/mark-paid` | `InvoiceController@markPaid` | `markPaid` on `Invoice` |
| GET | `/erp/purchase-orders` | `PurchaseOrderController@index` | `viewAny` on `PurchaseOrder` |
| POST | `/erp/purchase-orders` | `PurchaseOrderController@store` | `create` on `PurchaseOrder` |
| GET | `/erp/purchase-orders/{po}` | `PurchaseOrderController@show` | `view` on `PurchaseOrder` |
| PUT | `/erp/purchase-orders/{po}` | `PurchaseOrderController@update` | `update` on `PurchaseOrder` |
| DELETE | `/erp/purchase-orders/{po}` | `PurchaseOrderController@destroy` | `delete` on `PurchaseOrder` |
| POST | `/erp/purchase-orders/{po}/approve` | `PurchaseOrderController@approve` | `approve` on `PurchaseOrder` |
| GET | `/erp/sales-orders` | `SalesOrderController@index` | `viewAny` on `SalesOrder` |
| POST | `/erp/sales-orders` | `SalesOrderController@store` | `create` on `SalesOrder` |
| PUT | `/erp/sales-orders/{so}` | `SalesOrderController@update` | `update` on `SalesOrder` |
| DELETE | `/erp/sales-orders/{so}` | `SalesOrderController@destroy` | `delete` on `SalesOrder` |
| POST | `/erp/sales-orders/{so}/approve` | `SalesOrderController@approve` | `approve` on `SalesOrder` |
| GET | `/erp/products` | `ProductController@index` | `viewAny` on `Product` |
| POST | `/erp/products` | `ProductController@store` | `create` on `Product` |
| PUT | `/erp/products/{product}` | `ProductController@update` | `update` on `Product` |
| DELETE | `/erp/products/{product}` | `ProductController@destroy` | `delete` on `Product` |
| POST | `/erp/products/{product}/adjust-stock` | `ProductController@adjustStock` | `adjustStock` on `Product` |
| GET | `/erp/accounting/accounts` | `AccountController@index` | Gate `access-erp-accounting` |
| POST | `/erp/accounting/journal-entries` | `JournalController@store` | Gate `access-erp-accounting` |
| GET | `/erp/accounting/reports` | `FinancialReportController@index` | Gate `access-erp-accounting` |

### 10.5 HR Routes

| Method | Route | Controller@Method | Policy Gate |
|--------|-------|-------------------|-------------|
| GET | `/hr/employees` | `EmployeeController@index` | `viewAny` on `Employee` |
| POST | `/hr/employees` | `EmployeeController@store` | `create` on `Employee` |
| GET | `/hr/employees/{employee}` | `EmployeeController@show` | `view` on `Employee` |
| PUT | `/hr/employees/{employee}` | `EmployeeController@update` | `update` on `Employee` |
| DELETE | `/hr/employees/{employee}` | `EmployeeController@destroy` | `delete` on `Employee` |
| GET | `/hr/attendance` | `AttendanceController@index` | `viewAny` on `Attendance` |
| POST | `/hr/attendance` | `AttendanceController@store` | `create` on `Attendance` |
| PUT | `/hr/attendance/{attendance}` | `AttendanceController@update` | `update` on `Attendance` |
| DELETE | `/hr/attendance/{attendance}` | `AttendanceController@destroy` | `delete` on `Attendance` |
| GET | `/hr/leave-requests` | `LeaveRequestController@index` | `viewAny` on `LeaveRequest` |
| POST | `/hr/leave-requests` | `LeaveRequestController@store` | `create` on `LeaveRequest` |
| GET | `/hr/leave-requests/{leave}` | `LeaveRequestController@show` | `view` on `LeaveRequest` |
| PUT | `/hr/leave-requests/{leave}` | `LeaveRequestController@update` | `update` on `LeaveRequest` |
| DELETE | `/hr/leave-requests/{leave}` | `LeaveRequestController@destroy` | `delete` on `LeaveRequest` |
| POST | `/hr/leave-requests/{leave}/approve` | `LeaveRequestController@approve` | `approve` on `LeaveRequest` |
| POST | `/hr/leave-requests/{leave}/decline` | `LeaveRequestController@decline` | `approve` on `LeaveRequest` |
| GET | `/hr/expenses` | `ExpenseController@index` | `viewAny` on `Expense` |
| POST | `/hr/expenses` | `ExpenseController@store` | `create` on `Expense` |
| GET | `/hr/expenses/{expense}` | `ExpenseController@show` | `view` on `Expense` |
| PUT | `/hr/expenses/{expense}` | `ExpenseController@update` | `update` on `Expense` |
| DELETE | `/hr/expenses/{expense}` | `ExpenseController@destroy` | `delete` on `Expense` |
| POST | `/hr/expenses/{expense}/approve` | `ExpenseController@approve` | `approve` on `Expense` |
| POST | `/hr/expenses/{expense}/decline` | `ExpenseController@decline` | `approve` on `Expense` |

### 10.6 Other Module Routes

| Method | Route | Controller@Method | Policy Gate |
|--------|-------|-------------------|-------------|
| GET | `/meetings` | `MeetingController@index` | `viewAny` on `Meeting` |
| POST | `/meetings` | `MeetingController@store` | `create` on `Meeting` |
| PUT | `/meetings/{meeting}` | `MeetingController@update` | `update` on `Meeting` |
| DELETE | `/meetings/{meeting}` | `MeetingController@destroy` | `delete` on `Meeting` |
| GET | `/documents` | `DocumentController@index` | `viewAny` on `Document` |
| POST | `/documents` | `DocumentController@store` | `create` on `Document` |
| PUT | `/documents/{doc}` | `DocumentController@update` | `update` on `Document` |
| DELETE | `/documents/{doc}` | `DocumentController@destroy` | `delete` on `Document` |
| POST | `/documents/{doc}/share` | `DocumentController@share` | `share` on `Document` |
| POST | `/documents/{doc}/ai` | `DocumentAiController@process` | `useAi` on `Document` |
| GET | `/automations` | `AutomationController@index` | `viewAny` on `Automation` |
| POST | `/automations` | `AutomationController@store` | `create` on `Automation` |
| PUT | `/automations/{automation}` | `AutomationController@update` | `update` on `Automation` |
| DELETE | `/automations/{automation}` | `AutomationController@destroy` | `delete` on `Automation` |
| PUT | `/automations/{automation}/toggle` | `AutomationController@toggle` | `toggle` on `Automation` |
| GET | `/reports/company` | `ReportController@company` | Gate `view-company-reports` |
| GET | `/reports/team` | `ReportController@team` | Gate `view-team-reports` |
| GET | `/reports/financial` | `ReportController@financial` | Gate `view-financial-reports` |
| GET | `/reports/personal` | `ReportController@personal` | `viewPersonal` on `Report` |
| POST | `/reports/export` | `ReportController@export` | `export` on `Report` |
| GET | `/billing` | `BillingController@index` | Gate `access-billing` |
| POST | `/billing/upgrade` | `BillingController@upgrade` | Gate `access-billing` |
| PUT | `/billing/payment-method` | `BillingController@updatePayment` | Gate `access-billing` |
| DELETE | `/billing` | `BillingController@cancel` | Gate `access-billing` |

---

## 11. Frontend Enforcement

### 11.1 Role Context

```tsx
// src/contexts/RoleContext.tsx
interface RoleContext {
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  isPlatformOwner: boolean;
  workspaceId: string;
}

const RoleContext = createContext<RoleContext | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { data: me } = useCurrentMember(); // fetched once on mount

  return (
    <RoleContext.Provider value={me}>
      {children}
    </RoleContext.Provider>
  );
}
```

### 11.2 useRole Hook

```tsx
// src/hooks/useRole.ts
export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');

  const roleWeight: Record<string, number> = {
    owner: 100, admin: 80, manager: 60, member: 40, viewer: 20,
  };

  const atLeast = (minRole: string): boolean =>
    (roleWeight[ctx.role] ?? 0) >= (roleWeight[minRole] ?? 0);

  const is = (role: string): boolean => ctx.role === role;

  const can = {
    // Boards
    createBoard:    atLeast('manager'),
    deleteBoard:    atLeast('manager'),
    exportBoard:    atLeast('manager'),

    // HR
    viewAllLeave:   atLeast('manager'),
    approveLeave:   atLeast('manager'),
    viewSalary:     atLeast('admin'),
    manageEmployee: atLeast('admin'),

    // ERP
    accessAccounting:  atLeast('admin'),
    createInvoice:     atLeast('admin'),
    approvePO:         atLeast('admin'),

    // Reports
    viewCompanyReports:   atLeast('admin'),
    viewTeamReports:      atLeast('manager'),
    viewFinancialReports: atLeast('admin'),

    // Settings
    accessBilling:     atLeast('owner'),
    manageIntegrations: atLeast('admin'),
    inviteMembers:     atLeast('admin'),

    // Documents & AI
    useAi: atLeast('member'),

    // Automations
    createAutomation: atLeast('manager'),
  };

  return { role: ctx.role, atLeast, is, can, isPlatformOwner: ctx.isPlatformOwner };
}
```

### 11.3 Permission Gate Component

```tsx
// src/components/PermissionGate.tsx
interface Props {
  requires: keyof ReturnType<typeof useRole>['can'];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ requires, fallback = null, children }: Props) {
  const { can } = useRole();
  return can[requires] ? <>{children}</> : <>{fallback}</>;
}

// Usage
<PermissionGate requires="createBoard">
  <Button onClick={openCreateBoardModal}>New Board</Button>
</PermissionGate>

<PermissionGate requires="approveLeave" fallback={<Badge>Pending</Badge>}>
  <ApproveDeclineButtons leaveId={leave.id} />
</PermissionGate>
```

### 11.4 Route-Level Guards

```tsx
// src/router/guards.tsx
export function RequireRole({
  minRole,
  children,
}: {
  minRole: string;
  children: ReactNode;
}) {
  const { atLeast } = useRole();
  return atLeast(minRole)
    ? <>{children}</>
    : <Navigate to="/403" replace />;
}

// In router config
{
  path: '/billing',
  element: (
    <RequireRole minRole="owner">
      <BillingPage />
    </RequireRole>
  ),
},
{
  path: '/erp/accounting',
  element: (
    <RequireRole minRole="admin">
      <AccountingPage />
    </RequireRole>
  ),
},
{
  path: '/hr/employees',
  element: (
    <RequireRole minRole="admin">
      <EmployeesPage />
    </RequireRole>
  ),
},
```

### 11.5 Navigation Filtering

```tsx
// src/components/Sidebar.tsx
export function Sidebar() {
  const { can, atLeast } = useRole();

  const navItems = [
    { label: 'Boards',       href: '/boards',         show: true },
    { label: 'CRM',          href: '/crm',            show: atLeast('member') },
    { label: 'ERP',          href: '/erp',            show: atLeast('admin') },
    { label: 'HR',           href: '/hr',             show: atLeast('member') },
    { label: 'Reports',      href: '/reports',        show: atLeast('manager') },
    { label: 'Automations',  href: '/automations',    show: can.createAutomation },
    { label: 'Documents',    href: '/documents',      show: atLeast('member') },
    { label: 'Settings',     href: '/settings',       show: atLeast('admin') },
    { label: 'Billing',      href: '/billing',        show: can.accessBilling },
  ];

  return (
    <nav>
      {navItems.filter(item => item.show).map(item => (
        <SidebarLink key={item.href} {...item} />
      ))}
    </nav>
  );
}
```

### 11.6 Conditional Field Rendering

```tsx
// In EmployeeDetailPage
function EmployeeDetail({ employee }: { employee: Employee }) {
  const { can, is } = useRole();
  const isSelf = employee.userId === currentUser.id;
  const showSalary = can.viewSalary || isSelf;

  return (
    <div>
      <Field label="Name" value={employee.name} />
      <Field label="Title" value={employee.jobTitle} />
      {showSalary && (
        <Field label="Salary" value={formatCurrency(employee.salary)} />
      )}
    </div>
  );
}
```

---

## 12. Audit Trail Requirements

### 12.1 audit_logs Table Schema

```sql
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    impersonated_by UUID REFERENCES users(id) ON DELETE SET NULL, -- platform owner impersonation
    action        VARCHAR(100) NOT NULL,   -- e.g. 'leave_request.approved'
    entity_type   VARCHAR(100) NOT NULL,   -- e.g. 'LeaveRequest'
    entity_id     UUID,
    old_values    JSONB,
    new_values    JSONB,
    metadata      JSONB,                   -- IP, user agent, etc.
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_workspace    ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user         ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity       ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action       ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at   ON audit_logs(created_at DESC);
```

### 12.2 AuditLog Service

```php
// app/Services/AuditLogService.php
class AuditLogService
{
    public function record(
        string $action,
        Model $entity,
        array $oldValues = [],
        array $newValues = [],
        array $metadata = []
    ): void {
        AuditLog::create([
            'workspace_id'     => request()->workspace()?->id,
            'user_id'          => Auth::id(),
            'impersonated_by'  => session('impersonating_as') ? Auth::id() : null,
            'action'           => $action,
            'entity_type'      => class_basename($entity),
            'entity_id'        => $entity->getKey(),
            'old_values'       => $oldValues,
            'new_values'       => $newValues,
            'metadata'         => array_merge([
                'ip'         => request()->ip(),
                'user_agent' => request()->userAgent(),
            ], $metadata),
        ]);
    }
}
```

### 12.3 Required Audit Events

All the following actions **must** generate an audit log entry:

#### Authentication & Access

| Action | old_values | new_values |
|--------|-----------|-----------|
| `auth.login` | — | `{ip, user_agent}` |
| `auth.logout` | — | — |
| `auth.failed_login` | — | `{email, ip}` |
| `platform.impersonation_start` | — | `{target_workspace_id}` |
| `platform.impersonation_end` | — | `{target_workspace_id}` |

#### Workspace Management

| Action | old_values | new_values |
|--------|-----------|-----------|
| `workspace.created` | — | `{name, plan}` |
| `workspace.updated` | `{name, settings}` | `{name, settings}` |
| `workspace.deleted` | `{name}` | — |
| `member.invited` | — | `{email, role}` |
| `member.role_changed` | `{role}` | `{role}` |
| `member.removed` | `{role}` | — |
| `ownership.transferred` | `{owner_id}` | `{owner_id}` |

#### HR

| Action | old_values | new_values |
|--------|-----------|-----------|
| `leave_request.created` | — | `{type, from, to}` |
| `leave_request.approved` | `{status}` | `{status: approved, approved_by}` |
| `leave_request.declined` | `{status}` | `{status: declined, reason}` |
| `leave_request.cancelled` | `{status}` | `{status: cancelled}` |
| `expense.created` | — | `{amount, category}` |
| `expense.approved` | `{status}` | `{status: approved}` |
| `expense.declined` | `{status}` | `{status: declined, reason}` |
| `expense.deleted` | `{amount}` | — |
| `employee.salary_updated` | `{salary}` (redacted) | `{salary}` (redacted) |
| `employee.created` | — | `{name, email, role}` |
| `employee.deleted` | `{name}` | — |

#### ERP / Financial

| Action | old_values | new_values |
|--------|-----------|-----------|
| `invoice.created` | — | `{number, amount, contact_id}` |
| `invoice.sent` | `{status}` | `{status: sent}` |
| `invoice.marked_paid` | `{status}` | `{status: paid, amount}` |
| `invoice.deleted` | `{number, amount}` | — |
| `purchase_order.approved` | `{status}` | `{status: approved}` |
| `purchase_order.deleted` | `{number}` | — |
| `sales_order.approved` | `{status}` | `{status: approved}` |
| `inventory.stock_adjusted` | `{qty}` | `{qty, reason}` |
| `journal_entry.created` | — | `{amount, accounts}` |

#### Data Exports

| Action | old_values | new_values |
|--------|-----------|-----------|
| `export.crm` | — | `{format, record_count}` |
| `export.hr_employees` | — | `{format, record_count}` |
| `export.hr_leave` | — | `{format, record_count}` |
| `export.financial_reports` | — | `{format, date_range}` |
| `export.inventory` | — | `{format, record_count}` |

#### Settings & Automations

| Action | old_values | new_values |
|--------|-----------|-----------|
| `automation.created` | — | `{name, trigger}` |
| `automation.deleted` | `{name}` | — |
| `automation.toggled` | `{enabled}` | `{enabled}` |
| `integration.connected` | — | `{provider}` |
| `integration.disconnected` | `{provider}` | — |

### 12.4 Salary Field Redaction

When logging salary changes, hash or mask the salary value in audit logs:

```php
AuditLog::record('employee.salary_updated', $employee, [
    'salary_hash' => hash('sha256', (string) $oldSalary),
], [
    'salary_hash' => hash('sha256', (string) $newSalary),
    'currency'    => $employee->salary_currency,
    'updated_by_role' => request()->workspaceMember()->role,
]);
```

---

## 13. Migration Plan

### 13.1 New Columns on Existing Tables

```sql
-- Add is_platform_owner flag to users
ALTER TABLE users
    ADD COLUMN is_platform_owner BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_users_platform_owner
    ON users(is_platform_owner) WHERE is_platform_owner = true;
-- Note: remove this unique index if multiple platform owners are needed
```

```sql
-- Ensure workspace_members has all required columns
ALTER TABLE workspace_members
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;

-- Ensure only one owner per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_one_owner
    ON workspace_members(workspace_id)
    WHERE role = 'owner';
```

### 13.2 New Tables

```sql
-- Audit logs (see §12.1 above for full schema)

-- Leave types configuration
CREATE TABLE leave_types (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    days_allowed INT NOT NULL DEFAULT 0,
    carry_over   BOOLEAN NOT NULL DEFAULT false,
    paid         BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave balances
CREATE TABLE leave_balances (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id  UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year           SMALLINT NOT NULL,
    allocated      NUMERIC(5,2) NOT NULL DEFAULT 0,
    used           NUMERIC(5,2) NOT NULL DEFAULT 0,
    pending        NUMERIC(5,2) NOT NULL DEFAULT 0,
    UNIQUE (workspace_id, user_id, leave_type_id, year)
);

-- Salary records (separate table for tighter access control)
CREATE TABLE salary_records (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount       NUMERIC(15,2) NOT NULL,
    currency     CHAR(3) NOT NULL DEFAULT 'USD',
    effective_from DATE NOT NULL,
    effective_to   DATE,
    created_by   UUID REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records FORCE ROW LEVEL SECURITY;

CREATE POLICY salary_workspace_isolation ON salary_records
    USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
```

### 13.3 Indexes for Performance

```sql
-- workspace_members lookups are in every request
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace
    ON workspace_members(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_manager
    ON workspace_members(manager_id, workspace_id);

-- Common filtered queries per module
CREATE INDEX idx_leave_requests_user_workspace
    ON leave_requests(user_id, workspace_id, status);

CREATE INDEX idx_expenses_user_workspace
    ON expenses(user_id, workspace_id, status);

CREATE INDEX idx_attendance_user_workspace
    ON attendance(user_id, workspace_id, clock_in);

CREATE INDEX idx_deals_assigned_workspace
    ON deals(assigned_to, workspace_id);
```

### 13.4 Data Migration for Existing Role Data

If the codebase previously stored roles elsewhere, migrate them:

```php
// database/migrations/xxxx_migrate_roles_to_workspace_members.php
public function up(): void
{
    // Example: if roles were stored on a legacy 'team_members' table
    DB::statement("
        INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, created_at, updated_at)
        SELECT
            gen_random_uuid(),
            tm.workspace_id,
            tm.user_id,
            CASE
                WHEN tm.legacy_role = 'owner'   THEN 'owner'
                WHEN tm.legacy_role = 'admin'   THEN 'admin'
                WHEN tm.legacy_role = 'manager' THEN 'manager'
                WHEN tm.legacy_role = 'viewer'  THEN 'viewer'
                ELSE 'member'
            END,
            tm.created_at,
            now(),
            now()
        FROM team_members tm
        ON CONFLICT (workspace_id, user_id) DO UPDATE
            SET role = EXCLUDED.role
    ");
}
```

### 13.5 Migration Checklist

| Step | Status | Notes |
|------|:------:|-------|
| Add `users.is_platform_owner` | — | Run first; needed by ResolveWorkspace |
| Add `workspace_members.role` with check constraint | — | Replaces any legacy role column |
| Add `workspace_members.manager_id` | — | Required for team-scoped HR queries |
| Create `audit_logs` table | — | Needed before deploying audit-enabled code |
| Create `leave_types` table | — | Required for leave module |
| Create `leave_balances` table | — | Required for leave module |
| Create `salary_records` table | — | Separate from `employees` for RLS |
| Enable RLS on sensitive tables | — | After salary_records created |
| Add performance indexes | — | Run in low-traffic window |
| Migrate legacy role data | — | Verify row counts before/after |
| Seed leave types for each workspace | — | Post-migration job |
| Drop legacy role columns | — | After verification |

---

## Appendix A: Role Capability Summary

| Capability | Owner | Admin | Manager | Member | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| Access Billing | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer Ownership | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Workspace | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage HR (all) | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Salaries (all) | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Own Salary | ✅ | ✅ | ✅ | ✅ | ❌ |
| ERP Accounting | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Leave (team) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve Expenses (team) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Boards | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Automations | ✅ | ✅ | ✅ | ❌ | ❌ |
| Submit Leave/Expenses | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create CRM Deals | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read Shared Boards | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export Any Data | ✅ | ✅ | 👥 limited | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Appendix B: Forbidden Patterns

These patterns are explicitly prohibited and must be caught in code review:

```php
// ❌ NEVER — inline role check bypasses policy
if (Auth::user()->role === 'admin') { ... }

// ❌ NEVER — trusting client-submitted user_id
Expense::create(['user_id' => $request->user_id]);

// ❌ NEVER — unscoped query
$allInvoices = Invoice::all();

// ❌ NEVER — cross-workspace data access
$deal = Deal::find($id); // no workspace scope

// ✅ CORRECT — policy-driven
$this->authorize('update', $deal);

// ✅ CORRECT — self-assign
Expense::create(['user_id' => Auth::id()]);

// ✅ CORRECT — scoped by global scope + explicit check
$deal = Deal::findOrFail($id); // global scope applies
$this->authorize('view', $deal);
```

---

*End of document — 02-rbac-architecture.md*

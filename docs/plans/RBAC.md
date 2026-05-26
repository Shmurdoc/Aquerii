# RBAC — Role-Based Access Control

**Status:** ENHANCED DRAFT  
**Date:** 2026-05-25  
**Domain:** Authentication / Authorisation

---

## 1. Problem Statement

Aquerii currently has a single `role` string column on `workspace_members` (values: `owner`, `admin`, `member`). There is no concept of platform-level administration, no granular permission gates on any routes, no frontend permission guards, no 2FA enforcement, no SSO, and no session management. The codebase has a SQL injection risk in the RLS middleware session fallback path. These issues make the product unsuitable for enterprise sales.

---

## 2. Critical Security Fixes (Priority 0 — Before RBAC)

### 2.1 SQL Injection — RLS Middleware
**File:** `services/api/app/Core/Http/Middleware/SetWorkspaceTenant.php`

The session fallback path feeds raw session data into a `DB::statement()` with string interpolation. Fix:

```php
private function validateUuid(string $id): bool {
    return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $id);
}
// Apply to ALL three resolution paths: request, session, userId
```

### 2.2 Storage Quota Column Bug
**File:** `services/api/app/Core/Http/Controllers/Api/FileController.php:48`

```php
// Before (wrong)
$limit = (int) ($workspace->storage_limit_bytes ?? 5368709120);
// After
$limit = (int) ($workspace->storage_quota_bytes ?? 5368709120);
```

---

## 3. Role Hierarchy

```
Platform Owner  (system-level, 1 per SaaS deployment)
└── Company Owner  (workspace-level, 1+ per workspace)
    └── Manager / Project Manager  (workspace-level, delegated)
        └── Member / Employee  (workspace-level, default)
            └── Viewer  (read-only, Phase 2)
```

### 3.1 Role Definitions

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| `platform_owner` | Global | Impersonate any user, manage all workspaces, billing override, feature flags, global audit log |
| `owner` | Workspace | Full workspace control, invite/remove all roles, billing, delete workspace |
| `manager` | Workspace | Create/archive projects & boards, invite up to `member` role, approve POs/SOs, view all data |
| `member` | Workspace | Assigned work, create tasks/notes/docs, limited AI credits, no billing or member management |
| `viewer` *(Phase 2)* | Workspace | Read-only, no create, no AI, no billing |

### 3.2 Permission Matrix

| Action | platform_owner | owner | manager | member |
|--------|:-:|:-:|:-:|:-:|
| Delete workspace | ✓ | ✓ | ✗ | ✗ |
| Manage billing / Stripe | ✓ | ✓ | ✗ | ✗ |
| Invite owner | ✓ | ✓ | ✗ | ✗ |
| Invite manager | ✓ | ✓ | ✓ | ✗ |
| Invite member | ✓ | ✓ | ✓ | ✗ |
| Remove manager/owner | ✓ | ✓ | ✗ | ✗ |
| Remove member | ✓ | ✓ | ✓ | ✗ |
| View all projects | ✓ | ✓ | ✓ | own-only |
| Create project/board | ✓ | ✓ | ✓ | ✗ |
| Archive project/board | ✓ | ✓ | ✓ | ✗ |
| Create task/note/doc | ✓ | ✓ | ✓ | ✓ |
| Delete any item | ✓ | ✓ | ✓ | own only |
| Approve PO/SO | ✓ | ✓ | ✓ | ✗ |
| Create invoice | ✓ | ✓ | ✓ | ✗ |
| Use AI features | ✓ | ✓ | ✓ | quota-capped |
| View audit log | ✓ | ✓ | ✗ | ✗ |
| Manage integrations | ✓ | ✓ | ✗ | ✗ |
| Enforce 2FA for workspace | ✓ | ✓ | ✗ | ✗ |
| Access /platform console | ✓ | ✗ | ✗ | ✗ |
| Impersonate users | ✓ | ✗ | ✗ | ✗ |

---

## 4. Two-Factor Authentication (2FA)

The `users` table already has `two_factor_secret`, `two_factor_enabled`, `two_factor_recovery_codes` columns. What is missing is the UI and enforcement layer.

### 4.1 Setup Flow (Settings > Profile > Security)
1. User clicks "Enable 2FA"
2. Backend generates TOTP secret via `pragmarx/google2fa-laravel`
3. Frontend shows QR code + manual entry code
4. User enters 6-digit code to verify; backend stores secret + sets `two_factor_enabled = true`
5. Recovery codes displayed once — user copies/downloads them
6. "Disable 2FA" button shows (with confirmation)

### 4.2 Login Enforcement
After successful password check, if `two_factor_enabled = true`:
- API returns `{ requires_2fa: true, temp_token: "..." }`
- Frontend redirects to `/auth/2fa`
- User enters TOTP code; backend validates and issues full session token

### 4.3 Workspace-Level 2FA Enforcement (Owner setting)
Workspace owners can require all members to have 2FA enabled:
- Stored in `workspace.settings.require_2fa: true`
- Middleware checks: if `require_2fa` and `!user->two_factor_enabled` → redirect to 2FA setup before any workspace access
- Grace period: 7 days after enforcement is turned on

---

## 5. SSO / OAuth

The `oauth_accounts` table already supports multi-provider OAuth. Extend it for enterprise SSO.

### 5.1 Supported Providers (Phase 1)
- Google OAuth (already partially wired)
- Microsoft Entra ID (Azure AD) — important for enterprise
- GitHub (developer workspaces)

### 5.2 SAML / Enterprise SSO (Phase 2)
- Custom SAML 2.0 provider per workspace (store IdP metadata URL in workspace settings)
- JIT provisioning: create user account on first SSO login
- SCIM user provisioning endpoint for directory sync

### 5.3 Settings UI
Settings > Integrations > SSO:
- Connect Google / Microsoft / GitHub buttons (OAuth flow)
- SAML configuration (Phase 2): upload IdP metadata XML, set attribute mapping
- "Require SSO" toggle (disables password login for members)

---

## 6. Session Management

### 6.1 Active Sessions UI (Settings > Profile > Security)
Table showing:
- Device (parsed from User-Agent)
- IP address
- Last activity
- "This device" badge on current session
- "Revoke" button per session
- "Revoke all other sessions" button

### 6.2 Backend
Store sessions in `user_sessions` table (or extend Sanctum tokens):
```php
Schema::create('user_sessions', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('user_id');
    $table->string('token_hash', 64)->unique(); // bcrypt of Sanctum token
    $table->string('device_name', 200)->nullable();
    $table->string('ip_address', 45)->nullable();
    $table->text('user_agent')->nullable();
    $table->timestampTz('last_active_at');
    $table->timestampTz('created_at');
    $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
});
```

---

## 7. Database Changes

### 7.1 Migration: Expand `workspace_members.role`

```php
// Migration: 2026_05_26_000001_expand_workspace_member_roles.php
Schema::table('workspace_members', function (Blueprint $table) {
    $table->string('role', 50)->default('member')->change();
    $table->jsonb('permission_overrides')->default('{}')->after('role');
    $table->uuid('role_changed_by')->nullable()->after('permission_overrides');
    $table->timestampTz('role_changed_at')->nullable()->after('role_changed_by');
});
```

Data migration: `UPDATE workspace_members SET role = 'manager' WHERE role = 'admin'`

### 7.2 New Table: `platform_admins`

```php
Schema::create('platform_admins', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('user_id')->unique();
    $table->string('level', 50)->default('admin'); // 'super' | 'admin' | 'support'
    $table->uuid('granted_by')->nullable();
    $table->timestampTz('granted_at');
    $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
});
```

### 7.3 New Table: `audit_logs`

```php
Schema::create('audit_logs', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id')->nullable(); // null = platform-level event
    $table->uuid('user_id')->nullable();
    $table->string('action', 100); // 'member.invite', 'role.change', 'invoice.send', etc.
    $table->string('subject_type', 100)->nullable();
    $table->uuid('subject_id')->nullable();
    $table->jsonb('before')->nullable();
    $table->jsonb('after')->nullable();
    $table->string('ip_address', 45)->nullable();
    $table->text('user_agent')->nullable();
    $table->string('severity', 20)->default('info'); // info|warning|critical
    $table->timestampTz('created_at');
    $table->index(['workspace_id', 'created_at']);
    $table->index(['user_id', 'created_at']);
    $table->index(['action', 'created_at']);
});
```

### 7.4 New Table: `user_sessions`
(See Section 6.2)

---

## 8. Backend Implementation

### 8.1 Laravel Policies

```
app/Policies/
  WorkspacePolicy.php       — delete, update, billing, inviteOwner, inviteManager, inviteMember, removeMember, enforce2FA
  ProjectPolicy.php         — create, archive, viewAll
  BoardPolicy.php           — create, archive, view
  ItemPolicy.php            — create, update, delete, deleteAny
  InvoicePolicy.php         — create, update, send, delete, pdf
  SalesOrderPolicy.php      — create, update, approve, convert, delete
  PurchaseOrderPolicy.php   — create, update, approve, receive, delete
  PlatformPolicy.php        — impersonate, manageWorkspaces, viewGlobalAudit
  AIPolicy.php              — use (with credit quota check)
```

### 8.2 Middleware Stack

```php
// RouteServiceProvider — applied to all workspace-scoped routes
Route::middleware([
    'auth:sanctum',
    'workspace.resolve',     // existing SetWorkspaceTenant (fixed)
    'workspace.membership',  // new: ensure user is an active member
    '2fa.verified',          // new: if workspace requires 2FA, enforce it
])
```

### 8.3 Audit Logging Trait

```php
trait LogsAuditTrail {
    protected function audit(string $action, $subject = null, array $before = [], array $after = []): void {
        AuditLog::create([
            'workspace_id' => request()->workspace?->id,
            'user_id'      => auth()->id(),
            'action'       => $action,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id'   => $subject?->id,
            'before'       => $before,
            'after'        => $after,
            'ip_address'   => request()->ip(),
            'user_agent'   => request()->userAgent(),
        ]);
    }
}
```

Apply to: `WorkspaceController`, `InvoiceController`, `SalesOrderController`, `PurchaseOrderController`, all auth controllers.

---

## 9. Frontend Implementation

### 9.1 Auth Store Extension

```ts
interface WorkspaceMembership {
  workspaceId: string
  role: 'owner' | 'manager' | 'member'
  permissionOverrides: Record<string, boolean>
}

// authStore additions:
currentMembership: WorkspaceMembership | null
isPlatformOwner: boolean
requires2FA: boolean
```

### 9.2 Permission Hook

```ts
// hooks/usePermission.ts
export type PermissionAction =
  | 'workspace.delete' | 'workspace.billing'
  | 'member.invite' | 'member.remove'
  | 'project.create' | 'project.archive'
  | 'invoice.create' | 'invoice.send' | 'invoice.pdf'
  | 'purchase_order.approve' | 'sales_order.approve' | 'sales_order.convert'
  | 'ai.use'
  | 'audit.view'
  | 'platform.access'

const ROLE_PERMISSIONS: Record<string, PermissionAction[]> = {
  owner:   [...all actions...],
  manager: [...subset...],
  member:  ['project.view', 'item.create', 'item.update.own', 'ai.use', 'doc.create'],
}

export function usePermission(action: PermissionAction): boolean {
  const { currentMembership, isPlatformOwner } = useAuthStore()
  if (isPlatformOwner) return true
  const overrides = currentMembership?.permissionOverrides ?? {}
  if (action in overrides) return overrides[action]
  return ROLE_PERMISSIONS[currentMembership?.role ?? 'member']?.includes(action) ?? false
}
```

### 9.3 PermissionGate Component

```tsx
// components/auth/PermissionGate.tsx
export function PermissionGate({ action, fallback = null, children }) {
  const allowed = usePermission(action)
  return allowed ? <>{children}</> : <>{fallback}</>
}
```

### 9.4 Settings > Profile > Security Tab (new)
- 2FA setup/disable (QR code, recovery codes)
- Active sessions list with revoke buttons
- Password change
- Connected OAuth accounts

---

## 10. Platform Owner Console (`/platform`)

Route: `/platform` — only accessible if `isPlatformOwner === true`.

Sections:
- **Workspaces** — table with usage stats (seats, storage, AI credits), plan badge, "Impersonate owner" action
- **Users** — global user search, disable account, force password reset, bypass 2FA
- **Billing** — override plan, manually adjust seat/credit/storage quotas
- **Feature Flags** — toggle per-workspace or global features via `workspace.settings` JSONB
- **Audit Log** — global audit log with action filter, user filter, date range
- **Email Queue** — view BillionMail queue, retry failed emails
- **System Health** — service pings (DB, Redis, AI service, Gotenberg, S3)

---

## 11. Workspace Settings Additions

Add to `workspace.settings` JSONB:
```json
{
  "require_2fa": false,
  "require_sso": false,
  "allowed_sso_domains": [],
  "session_timeout_hours": 168,
  "ip_allowlist": [],
  "audit_retention_days": 90
}
```

---

## 12. Migration & Rollout

1. Deploy Priority 0 security fixes (RLS injection, storage quota bug) immediately
2. Deploy RBAC migration (additive, no breaking changes)
3. Seed: existing `admin` roles → `manager`, workspace `owner_id` → `owner` role in members
4. Enable policy gates behind `FEATURE_RBAC=true` env flag
5. Deploy 2FA UI (opt-in initially; forced enforcement is workspace-level opt-in)
6. Announce to users: role names updated

---

## 13. Open Questions

- Should `manager` split into `project_manager` (project-scoped) and `workspace_manager`?
- Per-project membership: assign members to specific projects with project-level roles?
- AI credit quota: per-user monthly limit within workspace, or workspace pool?
- Audit log retention: fixed 90 days or plan-dependent?

---

## 14. Success Criteria

- [ ] Priority 0 security fixes deployed and verified
- [ ] All API routes protected by Laravel policies; 403 returned for unauthorised access
- [ ] `platform_admins` table seeded for super-admin user
- [ ] Frontend renders correct UI based on role (no billing tab for `member`)
- [ ] Audit log records every role change, invite, and sensitive mutation
- [ ] 2FA setup UI functional; workspace-level enforcement works
- [ ] Active sessions list shows and revoke works
- [ ] Policy unit tests: every role × action combination covered

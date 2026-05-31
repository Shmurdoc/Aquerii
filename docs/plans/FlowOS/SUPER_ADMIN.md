# FlowOS — Super Admin Panel

**Version**: 1.0  
**Stack**: Laravel 11 + Filament 3 (PHP)  
**Service**: `services/super-admin/` (isolated Docker service, separate port)  
**Access**: Only reachable via internal network + VPN. Never public-facing.  
**DB Role**: `superadmin` PostgreSQL role — bypasses all RLS policies  
**Auth**: Separate auth table (`super_admins`), TOTP MFA mandatory, no SSO

---

## 1. Access Control

### Super Admin Roles

| Role | Description | Who |
|------|-------------|-----|
| `owner` | Full access — all actions, all data, billing controls | Platform owner only |
| `support` | Read all tenants, impersonate (read-only), no billing | Support team |
| `finance` | Revenue dashboards, invoices, refunds only | Finance team |
| `devops` | System health, logs, queue management, no tenant data | DevOps team |

### Authentication Flow
1. Navigate to `https://admin.flowos.internal` (VPN required)
2. Email + password (argon2id hashed, separate `super_admins` table)
3. TOTP 2FA (Google Authenticator / Authy) — mandatory, cannot be disabled
4. Session: 4-hour expiry, re-auth required for destructive actions
5. All actions logged to `super_admin_audit_log` (immutable — INSERT only, no UPDATE/DELETE)

---

## 2. Dashboard — Platform Overview

### Real-Time KPI Tiles (top of dashboard)

| Metric | Source | Refresh |
|--------|--------|---------|
| Total workspaces | `workspaces` count | 30s |
| Active workspaces (last 7 days) | activity_log | 30s |
| Total users | `users` count | 30s |
| DAU / MAU | ClickHouse events | 5min |
| MRR (USD) | Stripe live data | 5min |
| MRR (ZAR) | PayFast aggregation | 5min |
| Trial workspaces | plan = trial | 30s |
| Churn this month | cancelled subscriptions | 1hr |
| Storage used total | sum(storage_used_bytes) | 1hr |
| AI credits consumed today | ai_credit_log sum | 5min |
| Open support tickets | service desk count | 30s |
| Automation runs today | automation_runs count | 5min |

### Charts (last 30 days, daily granularity)
- New workspace signups (line chart)
- MRR growth (cumulative + daily delta)
- Plan distribution (donut: Free / Basic / Standard / Pro / Enterprise)
- AI credit consumption by model (Gemini vs Claude)
- Storage growth (stacked by plan tier)
- Feature adoption heatmap (which features are used per plan)

---

## 3. Workspace Management

### Workspace List
- Searchable / filterable by: plan, country, created date, active status, storage usage, seat count
- Columns: workspace name, owner email, plan, seats, storage, MRR contribution, last active, created date
- Click → Workspace Detail view

### Workspace Detail View

**Info Panel**:
- Workspace ID, name, slug, created date, timezone, country
- Owner name + email (click → User Detail)
- Current plan + billing cycle + next renewal date
- Subscription ID (Stripe or PayFast) — click → opens Stripe/PayFast dashboard

**Usage Panel**:
- Seats used / quota
- Storage used / quota (with breakdown by type: files, docs, attachments)
- Automation runs this month / quota
- AI credits used this month / quota
- Boards count, items count, documents count

**Billing Panel**:
- All invoices (date, amount, status, download link)
- Payment method on file (last 4 digits + expiry)
- Manual actions: Apply credit, Issue refund, Change plan, Extend trial, Cancel subscription

**Activity Panel**:
- Last 50 activity events (user, action, timestamp, IP)
- Login history (user, IP, device, success/fail)

**Members Panel**:
- All workspace members (name, email, role, last active, invited by)
- Actions: Remove member, Reset password, Force logout

---

## 4. User Management

### Global User Search
- Search by email, name, user ID
- Shows: all workspaces the user belongs to, roles per workspace, account status, last login IP

### User Detail View
- Account info: name, email, avatar, created date, verified status
- OAuth connections: Google, GitHub, Microsoft linked accounts
- Sessions: all active sessions (device, IP, last seen) — "Terminate All Sessions" button
- 2FA status: enabled/disabled (super admin can force-enable)
- Workspace memberships: list with role + workspace link
- Actions:
  - Force password reset (sends email)
  - Suspend account (blocks login across all workspaces)
  - Delete account (GDPR — soft delete, 30-day retention then purge)
  - Impersonate (see below)

### Impersonation (Support Use)

```php
// app/Filament/SuperAdmin/Actions/ImpersonateAction.php
public function impersonate(User $user, SuperAdmin $actor): string
{
    // Log before impersonation
    SuperAdminAuditLog::create([
        'actor_id'   => $actor->id,
        'action'     => 'impersonate_start',
        'target_type'=> 'user',
        'target_id'  => $user->id,
        'ip'         => request()->ip(),
        'metadata'   => ['reason' => $this->reason],
    ]);

    // Generate short-lived signed token (15 min)
    $token = ImpersonationToken::create([
        'super_admin_id' => $actor->id,
        'user_id'        => $user->id,
        'expires_at'     => now()->addMinutes(15),
        'read_only'      => true, // support role: always read-only
    ]);

    return "https://app.flowos.app/impersonate/{$token->token}";
}
```

- Impersonation banner always visible to impersonated user: "FlowOS Support is viewing your account"
- `read_only = true` for `support` role: all write actions blocked
- `owner` role: can impersonate with write access (for debugging critical issues)
- Auto-expires after 15 minutes
- All actions during impersonation tagged `impersonated_by: {super_admin_id}` in audit log

---

## 5. Billing & Revenue

### Revenue Dashboard
- MRR breakdown by plan tier (table + bar chart)
- New MRR vs. Expansion MRR vs. Churned MRR (waterfall chart)
- Payment processor split: Stripe vs. PayFast (pie chart)
- Failed payments list: workspace, amount, failure reason, retry count, last attempt
- Upcoming renewals (next 7 days): workspace, plan, amount, processor

### Manual Billing Actions

| Action | Roles | Confirmation Required |
|--------|-------|-----------------------|
| Apply credit (USD/ZAR) | owner, finance | Yes — amount + reason |
| Issue refund | owner, finance | Yes — amount + reason |
| Force plan upgrade | owner | Yes — new plan |
| Force plan downgrade | owner | Yes — new plan |
| Extend trial (+N days) | owner, support | Yes — days + reason |
| Cancel subscription | owner, finance | Yes — immediate or end-of-period |
| Pause subscription | owner, finance | Yes — duration |
| Waive overage charge | owner, finance | Yes — amount |

All billing actions → entry in `super_admin_audit_log` + email notification to workspace owner.

---

## 6. System Health

### Services Status Panel
Real-time health of all FlowOS services:

| Service | Health Check | Alert Threshold |
|---------|-------------|-----------------|
| Laravel API | `/health` endpoint | response > 500ms or 5xx |
| Node.js Realtime | Socket.IO ping | no pong in 10s |
| Python AI Service | `/health` endpoint | response > 2s |
| PostgreSQL (primary) | `SELECT 1` | latency > 100ms |
| PostgreSQL (replica) | replication lag | lag > 30s |
| Redis | `PING` | no response in 1s |
| Meilisearch | `/health` | not `available` |
| ClickHouse | `SELECT 1` | latency > 500ms |
| Horizon (queues) | Horizon API | paused or failing |
| Storage (S3/R2) | HEAD request | error response |

### Queue Monitor (Horizon)
- Live queue depths: `default`, `ai`, `notifications`, `automations`, `indexing`
- Failed jobs list: job class, payload preview, error message, attempts, last attempt time
- Actions: Retry failed job, Delete failed job, Retry all failed (with confirmation)
- Throughput charts: jobs/minute per queue (last 1 hour)

### Slow Query Log
- PostgreSQL slow queries (> 1s): query, duration, workspace_id, timestamp
- Top 10 slowest queries (last 24h)
- One-click `EXPLAIN ANALYZE` (runs against replica, never primary)

### Error Tracking Feed
- Live feed of application exceptions (from Sentry/Bugsnag integration)
- Filter by: severity, workspace_id, service, time range
- Click → full stack trace + context

---

## 7. Feature Flags

Global feature flags managed here, override per workspace:

```
flags/
├── ai_task_assistant          (global on/off + per-plan override)
├── canvas_view                (global on/off)
├── github_integration         (global on/off)
├── white_label                (enterprise only — per-workspace toggle)
├── rag_knowledge_base         (global on/off)
├── crm_lead_scoring           (pro+ only)
├── time_tracking              (standard+ only)
├── guest_access               (all plans)
└── maintenance_mode           (global — disables all logins except super admin)
```

**Maintenance Mode**: When enabled:
- All app logins return 503 with maintenance page
- Super admin login still works
- Webhook endpoints remain active (queued for processing after maintenance)
- Banner shown on status page

---

## 8. Announcements & Communications

- **In-app banners**: Create platform-wide or plan-targeted banners (e.g., "Scheduled maintenance Sunday 2am UTC")
- **Email blast**: Send to: all users / all workspace owners / specific plan tier / specific workspace
- **Changelog entries**: Publish product updates visible in app `?` menu

---

## 9. Data & Compliance

### GDPR / POPIA Controls
- **Data export**: Generate full workspace data export (JSON + CSV) on owner request — queued job, download link emailed
- **Right to erasure**: Soft-delete user → schedule hard purge after 30 days → purge removes PII from all tables, replaces with `[deleted]` tombstone
- **Data residency**: View per-workspace data residency setting (EU / US / ZA)
- **Consent log**: View per-user consent timestamps (terms accepted, marketing opt-in/out)

### Audit Log
- All super admin actions stored in `super_admin_audit_log`
- Immutable: INSERT only — no UPDATE or DELETE ever (enforced at DB level with trigger)
- Fields: `id`, `actor_id`, `action`, `target_type`, `target_id`, `ip`, `user_agent`, `metadata JSONB`, `created_at`
- Retention: 7 years (regulatory requirement)
- Exportable to CSV by date range

---

## 10. Database Schema (Super Admin specific)

```sql
-- Separate schema, not subject to workspace RLS
CREATE SCHEMA superadmin;

CREATE TABLE superadmin.super_admins (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,           -- argon2id
    totp_secret TEXT,                    -- encrypted at rest
    totp_enabled BOOLEAN DEFAULT FALSE,
    role        TEXT NOT NULL CHECK (role IN ('owner','support','finance','devops')),
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE superadmin.super_admin_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    UUID REFERENCES superadmin.super_admins(id),
    action      TEXT NOT NULL,
    target_type TEXT,                    -- 'workspace', 'user', 'system', etc.
    target_id   TEXT,
    ip          INET,
    user_agent  TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);
-- Enforce immutability
CREATE RULE audit_no_update AS ON UPDATE TO superadmin.super_admin_audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO superadmin.super_admin_audit_log DO INSTEAD NOTHING;

CREATE TABLE superadmin.impersonation_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token           TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    super_admin_id  UUID REFERENCES superadmin.super_admins(id),
    user_id         UUID REFERENCES public.users(id),
    read_only       BOOLEAN DEFAULT TRUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE superadmin.feature_flags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag        TEXT UNIQUE NOT NULL,
    enabled     BOOLEAN DEFAULT TRUE,
    plan_gate   TEXT[],                  -- null = all plans, or ['pro','enterprise']
    workspace_overrides JSONB DEFAULT '{}', -- {"workspace_id": true/false}
    updated_by  UUID REFERENCES superadmin.super_admins(id),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
```

---

*Owner: Platform Owner + DevOps Lead*  
*Cross-reference: ARCHITECTURE.md §2 (service topology), DATABASE_SCHEMA.md (RLS), PRICING_AND_BILLING.md (billing actions)*

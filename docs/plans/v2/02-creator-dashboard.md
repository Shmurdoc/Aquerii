# Phase 2 — Creator Dashboard (Super-Admin)

## Objective
Build a powerful platform-level dashboard for the **creator** (SaaS platform owner). This is NOT a regular user feature — this is the command center for running the SaaS business.

## What the Creator Sees

### Dashboard Home
- Total workspaces (active/trial/cancelled)
- Total users, new signups (7d/30d)
- Monthly Recurring Revenue (MRR) chart
- Plan distribution pie chart (Free vs Growth vs Business vs Enterprise)
- System health: all services up/down
- Recent errors from logs

### Subscription Management
- List all workspaces with their current plan
- Override a workspace's plan (for enterprise deals, trials, comp)
- View billing history per workspace
- Manually create/modify invoices
- Export subscription data to CSV

### Feature Flag Control
- Global toggle: enable/disable any feature across all workspaces
- Per-workspace override: enable Premium AI for specific workspace
- Feature usage stats: which features are most/least used
- Feature roadmap: planned/experimental/beta/GA status

### Database Space Allocation
- Per-workspace storage usage: DB size, file storage, total
- Top consumers: workspaces using the most space
- Set/quota management: override per-workspace limits
- Storage trend chart (30d)

### Ticket Management
- All support tickets across all workspaces
- Filter by workspace, priority, status, assigned agent
- Reply as admin directly
- SLA compliance dashboard
- Most common issue categories

### Email Tracking
- Email accounts configured per workspace
- Email volume (sent/received per day)
- Failed email deliveries
- IMAP connection errors

### Audit Log
- Immutable audit log across all workspaces
- Search by user, action, entity, workspace
- Export for compliance/legal
- Anomaly detection: unusual access patterns

## Implementation

### Technology
- Uses **Filament 3** (already installed) for the admin panel
- Separate route: `/admin/*` on a subdomain or path
- Already has `SuperAdmin` model and `AdminPanelProvider`

### Tasks

#### 2.1 — Admin Home Dashboard
- `app/Modules/Admin/Filament/Pages/Dashboard.php`
- Stats overview widgets
- MRR chart (Recharts iframe or Filament chart widget)
- Recent errors feed from logs

#### 2.2 — Workspace Management Resource
- `app/Modules/Admin/Filament/Resources/WorkspaceResource.php`
- Table with search, filters (plan, status, created date)
- Actions: override plan, extend trial, suspend, delete
- View workspace details: members, boards, storage usage

#### 2.3 — Subscription & Billing Management
- `app/Modules/Admin/Filament/Resources/BillingResource.php`
- List all billing events, invoices, payment attempts
- Manual invoice creation
- Plan override action

#### 2.4 — Feature Flag Admin
- `app/Modules/Admin/Filament/Resources/FeatureFlagResource.php`
- CRUD for feature flags
- Per-workspace override table
- Usage analytics

#### 2.5 — Storage & Database Monitoring
- `app/Modules/Admin/Filament/Pages/StorageAnalytics.php`
- Query `pg_database_size()` per workspace database
- Track file storage per workspace from `files` table
- Quota enforcement dashboard

#### 2.6 — Support Ticket Global View
- `app/Modules/Admin/Filament/Resources/TicketResource.php`
- Cross-workspace ticket list
- Reply widget
- SLA compliance heatmap

#### 2.7 — Email Tracking Dashboard
- `app/Modules/Admin/Filament/Pages/EmailAnalytics.php`
- Email accounts per workspace
- Failed deliveries
- IMAP health check

#### 2.8 — Audit Log Viewer
- `app/Modules/Admin/Filament/Resources/AuditLogResource.php`
- Immutable read-only table
- Filters, search, export
- Anomaly flagging

### Files Modified
- `app/Modules/Admin/` (Filament resources and pages)
- `app/Core/Http/Middleware/` (admin auth gate)
- `routes/admin.php` (admin routes)
- `config/filament.php` (admin panel config)

### API Endpoints (for real-time admin panel)
- `GET /api/admin/stats` — dashboard stats
- `GET /api/admin/storage-breakdown` — per-workspace storage
- `GET /api/admin/mrr-history` — MRR over time
- `GET /api/admin/feature-usage` — feature adoption stats

## CI Gate
```bash
php artisan test --testsuite=Feature --filter="Admin|Billing"
```

## Commit (per resource)
Each Filament resource gets its own commit:
1. `feat(admin): workspace management resource`
2. `feat(admin): subscription and billing management`
3. `feat(admin): feature flag control panel`
4. `feat(admin): storage and database monitoring`
5. `feat(admin): cross-workspace ticket management`
6. `feat(admin): email tracking dashboard`
7. `feat(admin): audit log viewer with export`

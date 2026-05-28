# 21 — Enterprise Features, Offline Mode & Mobile Strategy

---

## Routes

```
/workspaces/{workspaceId}/settings/sso         → SSOSettingsPage (❌ placeholder)
/workspaces/{workspaceId}/trash                → TrashPage (⚠️ partial)
/workspaces/{workspaceId}/settings/permissions → GranularPermissionsPage (❌ placeholder)
/workspaces/{workspaceId}/settings/audit-logs  → AuditLogPage (✅ EXISTS)
/settings/profile                             → ProfilePage (✅ EXISTS)
/workspaces/{workspaceId}/settings/billing     → BillingPage (✅ EXISTS)
```

---

## SSO/SCIM Settings — SSOSettingsPage (❌ DOES NOT EXIST)

### Route

```
/workspaces/{workspaceId}/settings/sso → SSOSettingsPage
```

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Single Sign-On & SCIM                           Enterprise Feature      [🔒]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  Provider ············································ [Azure AD ▾]     ││
│  │  Status ·············································· ○ Disconnected   ││
│  │                                                                          ││
│  │  Tenant ID ······································ [________________]    ││
│  │  Client ID ······································ [________________]    ││
│  │  Client Secret ·································· [________________]    ││
│  │  Redirect URI ···················· https://acme.aquerii.app/auth/callback││
│  │                                                                          ││
│  │  Allowed Domains ················ [acme.com] [acme.co.uk] [+ Add]      ││
│  │                                                                          ││
│  │  Just-in-Time Provisioning ······ ● Enable  ○ Disable                  ││
│  │  Auto-join Workspace ············ ● Enable  ○ Disable                  ││
│  │  Default Role ··················· [Member ▾]                           ││
│  │                                                                          ││
│  │  [Test Connection]   [Disconnect]                                       ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  SCIM Provisioning                      Status: ⚪ Not Configured         ││
│  │                                                                          ││
│  │  SCIM Base URL ········· https://api.aquerii.app/scim/v2                ││
│  │  API Token ······························ [Generate New Token]          ││
│  │  Token ·································· [••••••••••••••••] [Copy]    ││
│  │                                                                          ││
│  │  Groups Sync ···························· ● Enable  ○ Disable           ││
│  │  Last Sync ······························ Never                         ││
│  │                                                                          ││
│  │  [Sync Now]                                                              ││
│  └──────────────────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────────────────┤
│  Connection Log                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  May 15, 2026 10:32 AM  ⚠️ Connection test failed: Invalid tenant       ││
│  │  May 10, 2026 09:15 AM  ✅ SCIM sync completed: 45 users provisioned    ││
│  └──────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

**BRUTAL CALL-OUT: Zero SSO/SCIM infrastructure exists. This entire page is a placeholder. There are no SAML/OIDC identity providers configured, no SCIM endpoints, no JIT provisioning, no token management. The design above is aspirational enterprise vaporware. The page should ship with a single message: "Enterprise SSO is not yet available. Contact sales for early access."**

### Provider Dropdown

Options: Azure AD, Okta, Google Workspace, OneLogin, Custom SAML 2.0.

Each selection changes the form fields slightly:
- Azure AD: Tenant ID, Client ID, Client Secret, Allowed Domains.
- Okta: Domain, API Token, Client ID, Client Secret.
- Google Workspace: Client ID, Client Secret, Allowed Domains.
- Custom SAML 2.0: SSO URL, Entity ID, Certificate (upload .pem), Name ID format.

### Test Connection

- POST /api/settings/sso/test — ❌ **new endpoint needed.**
- Loading state: spinner on button, "Testing connection..."
- Success: green checkmark + "Connection successful. Redirect URI configured."
- Failure: red X + error message inline.

### SCIM Section

- **SCIM Base URL**: auto-generated, read-only. Points to `https://api.aquerii.app/scim/v2`.
- **API Token**: "Generate New Token" → POST /api/settings/scim/token — ❌ **new endpoint.**
- **Groups Sync**: toggle to sync Azure AD groups → workspace roles.
- **Sync Now**: button triggers SCIM sync. POST /api/settings/scim/sync — ❌ **new endpoint.**
- **Last Sync**: timestamp or "Never."

### States

- **Not configured**: "Connect your identity provider to enable SSO." large empty state with provider logos.
- **Connected**: shows provider name, connected date, "Disconnect" button with confirmation dialog.
- **Loading**: skeleton form fields (3 text lines + button skeleton).
- **Error**: "Connection failed. Check your credentials and try again." with specific error message.

---

## Recycle Bin / TrashPage (⚠️ PARTIAL)

### Route

```
/workspaces/{workspaceId}/trash → TrashPage
```

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Trash                                                    [Empty Trash]      │
│                                                                              │
│  Items and boards moved to trash are deleted after 30 days.                  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  [Items] [Boards]  [All]                           [Search deleted...]  ││
│  ├─────────┬──────────┬──────────┬──────────┬────────┬──────────────────────┤│
│  │  Type   │  Name    │  Deleted │  By      │  Reten.│  Actions             ││
│  │  📋 Item│ Fix login│ 05/12/26 │  Jane    │  28d   │  [↩ Restore] [✕ Del]││
│  │  📋 Item│ Update   │ 05/10/26 │  John    │  26d   │  [↩ Restore] [✕ Del]││
│  │         │  README  │          │          │        │                      ││
│  │  📋 Item│ Ship v2  │ 05/01/26 │  Alice   │  19d   │  [↩ Restore] [✕ Del]││
│  │  📋 Item│ Q3 Plan  │ 04/28/26 │  Bob     │  14d   │  [↩ Restore] [✕ Del]││
│  │  📋 Item│ SEO Audit│ 04/15/26 │  Jane    │   3d   │  [↩ Restore] [✕ Del]││
│  └─────────┴──────────┴──────────┴──────────┴────────┴──────────────────────┘│
│                                                                              │
│  Showing 5 of 5 deleted items. Auto-delete in 30 days.                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

Backend has: `version` field on items (supports soft-delete via versioning). **No explicit soft-delete or trash endpoints exist.**

**BRUTAL CALL-OUT: Items have a `version` field that suggests optimistic concurrency/versioning, but there is NO trash/deleted endpoint. The superprompt describes "restore from trash with 30/60/90 day configurable retention." This requires: (a) a `deleted_at` column on items and boards, (b) a soft-delete policy (PUT with `deleted_at=now()` instead of DELETE), (c) a retention purge cron, (d) GET/DELETE /api/trash endpoints. None of this exists.**

### Filter Tabs

- **All**: shows every soft-deleted item + board.
- **Items**: only deleted items (`trashable_type === 'item'`).
- **Boards**: only deleted boards (`trashable_type === 'board'`).
- **Search**: text input, debounced 300ms. Filters by name.

### Each Row

- **Type icon**: 📋 for items, 📋 for boards (different shade).
- **Name**: original name, truncated to 50 chars.
- **Deleted date**: when soft-delete occurred.
- **By**: who deleted it (from `deleted_by` field — ❌ **does not exist**).
- **Retention**: days remaining before permanent deletion (30 - days_since_deletion). Color-coded: green (>20d), yellow (10-20d), red (<10d).
- **Actions**:
  - **Restore**: POST /api/trash/{id}/restore — ❌ **new endpoint.** Restores the item/board to its original board/workspace with original status.
  - **Delete Forever**: DELETE /api/trash/{id} — ❌ **new endpoint.** Confirmation dialog: "This action cannot be undone. The item will be permanently deleted."

### Retention Settings

Option in the page header or Settings → Data Management:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Trash Retention Settings                                                    │
│                                                                              │
│  Auto-delete items after  [30 ▾]  days   (Options: 7, 30, 60, 90, Never)    │
│                                                                              │
│  [Save]                                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Stored in workspace settings (PATCH /api/workspaces/{id} — ✅ EXISTS).
- **"Never"**: items remain in trash until manually deleted. Show warning: "Items will remain in trash indefinitely. Storage costs may apply."
- **Default**: 30 days.

### Empty State

```
      🗑
  Trash is empty
  Deleted items and boards will appear here.
```

### States

- **Loading**: skeleton table (5 rows × 5 columns, shimmer).
- **Empty**: as above.
- **Error**: "Could not load trash. The trash endpoint may not be available." Show retro-style message: "Check that soft-delete is enabled on your plan."
- **Restore in progress**: row shows spinner on Restore button. On success, row animates slide-out. On failure, show error toast.

---

## Audit Log Page — AuditLogPage (✅ EXISTS)

### Route

```
/workspaces/{workspaceId}/settings/audit-logs → AuditLogPage
```

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Audit Log                                    [Export CSV]  [Date Range ▾] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Action       Actor           Target          Details           Timestamp   │
│  ────────────────────────────────────────────────────────────────────────   │
│  🔧 Update    Jane Smith      WORKSPACE       Changed name       10:32 AM   │
│  🔑 Login     John Doe        SESSION         IP: 192.168.1.1   09:15 AM   │
│  🗑 Delete     Alice Wang      ITEM: SO-042    "Fix login"        May 15    │
│  👤 Invite    Bob Chen        USER: jane@...  Role: Member       May 14    │
│  ⚙️ Create    Jane Smith      BOARD: Design   Public board       May 14    │
│  🛡️ Permission| Admin         WORKSPACE       Role changed       May 13    │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ← Prev  1 2 3 ... 12  Next →                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Backend: GET /api/settings/audit-logs — ✅ EXISTS.

### Filter Controls

- **Date Range**: preset buttons (Today, Last 7 days, Last 30 days, This Month, Custom) or date picker. Sends `?from=&to=` query params.
- **Action Type**: dropdown: All, Login, Create, Update, Delete, Permission Change, Invite, Export. Filters by `action` field.
- **Actor**: text input, filters by actor name/email.
- **Search**: free text, searches `details` field.

### Table Columns

- **Action**: icon + action name (12px bold, uppercase).
- **Actor**: name + email (12px gray). Click → view actor profile.
- **Target**: what was affected (Workspace, Item: SO-042, Board: Design). Clickable if target exists.
- **Details**: truncated (1 line, 60 chars max). Tooltip on hover shows full details.
- **Timestamp**: relative ("10:32 AM", "Yesterday", "May 14") if within current week, else full date. Tooltip shows full ISO timestamp.
- **IP Address**: visible on hover or optional column. ❌ **Only if backend returns `ip_address` field.**

### Export

- **Export CSV** button: GET /api/settings/audit-logs/export?from=&to= — ❌ **check if this endpoint exists. If not, implement client-side CSV generation from current filtered results.**
- CSV columns: Action, Actor Name, Actor Email, Target Type, Target ID, Target Name, Details, Timestamp, IP Address.

### States

- **Loading**: skeleton table (5 rows, shimmer).
- **Empty**: "No audit log entries found for the selected filters. Try a broader date range."
- **Error**: "Audit log is not available." with retry button.
- **Pagination**: server-side. Page size: 50. Show "Showing 1-50 of 1,234 entries."

---

## Granular Permissions — GranularPermissionsPage (⚠️ PARTIAL)

### Route

```
/workspaces/{workspaceId}/settings/permissions → GranularPermissionsPage
```

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Permissions                                                    Enterprise   │
├──────────────────────────────────────────────────────────────────────────────┤
│  Workspace Roles (EXISTS)                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  Role           Members  Permissions                                      ││
│  │  ─────────────  ───────  ───────────────────────────────────────────      ││
│  │  Owner      ●  1        Full access, billing, delete workspace          ││
│  │  Admin      ●  3        Full access except billing and workspace delete ││
│  │  Manager    ●  5        Create/edit boards, manage members, reports     ││
│  │  Member     ●  12       Create/edit items, view boards, comments        ││
│  │  Viewer     ●  20       Read-only access to all boards and items        ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Project-Level Permissions (❌ DOES NOT EXIST)                                │
│                                                                              │
│  Board                                    Permissions                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  Design System    ● Visible to all  ● Editable by: [Members ▾]          ││
│  │  Bug Tracker      ● Visible to all  ● Editable by: [Members ▾]          ││
│  │  Q3 Planning      ● Visible to: [Managers+ ▾]  ● Editable by: [Owners ▾]││
│  │  HR Documents     ● Visible to: [Specific... ▾]  ● Editable by: [Admin ▾]││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Field-Level Permissions (❌ DOES NOT EXIST)                                  │
│                                                                              │
│  Item Field       Viewer         Member         Manager         Admin       │
│  ─────────────    ───────────    ───────────    ───────────     ─────────── │
│  Title & Desc.    Read-only      Read/Write     Read/Write      Read/Write  │
│  Status           Read-only      Read/Write     Read/Write      Read/Write  │
│  Priority         Read-only      Read/Write     Read/Write      Read/Write  │
│  Due Date         Read-only      Read/Write     Read/Write      Read/Write  │
│  Attachments      Read-only      Read/Write     Read/Write      Read/Write  │
│  Financial Data   ❌ Hidden      ❌ Hidden      Read-only       Read/Write  │
│  └───────────────┴───────────────┴──────────────┴───────────────┴──────────┘│
│                                                                              │
│  [Save Permissions]   [Reset to Defaults]                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

Backend: GET/PUT /api/workspaces/{id} with member roles — ✅ EXISTS for workspace-level. Project-level and field-level — ❌ **DOES NOT EXIST.**

**BRUTAL CALL-OUT: Workspace roles (owner/admin/manager/member/viewer) exist and are functional. Project-level permissions (per-board visibility/editing scopes) and field-level permissions (hide/show fields per role) are complete fiction. The entire bottom half of this page is aspirational — it requires a full role-permission matrix database, middleware checks on every endpoint, and UI for managing granular access. This is months of work.**

### Workspace Roles Section (EXISTS)

- Read-only table showing the 5 workspace roles and their description.
- Click a role row → expand to show member list in that role.
- Member list shows avatar, name, email, joined date, "Change Role" button.
- "Change Role": dropdown with available roles. Updates via PUT /api/workspaces/{id}/members/{userId} — ✅ EXISTS.

### Project-Level Permissions Section (PLACEHOLDER)

- **V1**: Show a banner: "Fine-grained board permissions are an Enterprise feature. Contact sales to enable."
- **V2+**: Each board row shows:
  - Visibility selector: "Visible to all," "Visible to [role]+," "Visible to specific people" (→ multi-select).
  - Editability selector: "Editable by [role]+," "Editable by specific people."
- **Edge case**: A board with restricted visibility should not appear at all for users who don't have access (server-side filtering — ❌ **backend must enforce this, not just the UI**).

### Field-Level Permissions Section (PLACEHOLDER)

- **V1**: Show banner: "Field-level permissions are not yet available."
- **V2+**: Toggle matrix. Each row = item field, each column = role. Cell = toggle between Hidden / Read-only / Read-Write.
- Save sends PATCH /api/workspaces/{id}/permissions/fields — ❌ **new endpoint needed.**

---

## Offline Mode — Service Worker + IndexedDB (❌ DOES NOT EXIST)

### Architecture

```
Browser ──────────→ Service Worker ──────────→ Network
    │                      │
    │   Cache-First        │   IndexedDB store
    │   (boards, items,    │   (pending mutations,
    │    employees)         │    last-fetched data)
    │                      │
    └──────────────────────┘
        Online: SW fetches from network, caches response, returns to UI.
        Offline: SW serves from cache. UI writes to IndexedDB sync queue.
        Reconnect: SW processes sync queue, reconciles conflicts.
```

**BRUTAL CALL-OUT: Offline mode requires: a Service Worker for network interception, an IndexedDB schema mirroring the API data model, a mutation queue with conflict resolution, and a sync engine. Zero of this exists. The design below is a spec for what needs building. Do NOT estimate this as a sprint task — it's a 2-3 month parallel workstream.**

### Components

#### Service Worker (sw.js)

- Installed on first page load. Caches: app shell (HTML, CSS, JS assets), API responses for boards, items, employees, departments.
- Cache strategy: **Cache-first** for GET requests to `/api/workspaces/{id}/boards`, `/api/workspaces/{id}/items`. **Network-first** for auth endpoints, notifications, settings.
- Stale-while-revalidate: API responses served from cache immediately, then re-fetched in background to update cache.
- Fallback: when offline and no cache exists, serve a static "You are offline" page.

#### IndexedDB Sync Queue

- Queue table: `{ id, endpoint, method, body, timestamp, retry_count, status }`.
- Every POST/PUT/DELETE that fails due to network error is queued.
- On reconnect (detected via `navigator.onLine` + periodic health checks), process queue sequentially.
- Conflict resolution: **last-write-wins** by default. For status conflicts (item updated offline but also changed server-side), show conflict dialog: "This item was modified while you were offline. [Use my version] [Use server version] [Review both]."

#### Offline Indicator

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  You are offline. Changes will sync when connection is restored. [3]    │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Syncing... 12 of 40 changes    │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Offline banner**: fixed at top of viewport. Yellow background (`--color-warning-bg`), warning icon, text: "You are offline."
- **Sync progress bar**: shown during reconnection. Green progress fill. "12 of 40 changes synced."
- **Pending count badge**: number of queued mutations shown in the banner. Red badge.
- **Dismissible**: user can dismiss the banner once synced. Returns on next offline event.
- **Connection status dot** in global header: green (online), yellow (reconnecting), red (offline). ✅ Socket.IO already has this concept — extend to cover API connectivity.

### Offline-Capable Views

| View | Offline Support | Notes |
|------|----------------|-------|
| Board list (Kanban/Table) | ✅ Read cached | Last-fetched data shown. "Last updated: 2h ago" |
| Item detail | ✅ Read cached | Comments and activity log are stale |
| Employee directory | ✅ Read cached | Department filter works from cached departments |
| Inbox/Notifications | ❌ No | Notifications are real-time — offline = no data |
| Chat | ❌ No | No chat backend at all |
| Create/edit item | ⚠️ Queue mutation | Queued to IndexedDB. Conflict risk on sync |
| Comments | ⚠️ Queue mutation | Queued. Show as "pending" with ⏳ indicator |
| Settings changes | ❌ No | Offline mutation of settings is dangerous — block with message |

### Dependency

Offline mode requires the Service Worker registration to happen at app mount:

```typescript
// src/main.tsx (conceptual)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' });
}
```

- Register on first load. Update check on subsequent visits.
- **Skip waiting**: on new SW version, show toast: "A new version is available. [Update]". Click triggers `skipWaiting()` + page reload.

---

## Push Notifications (❌ DOES NOT EXIST)

### Flow

```
User clicks "Enable Push" → Browser requests Notification permission
→ If granted: register Service Worker → subscribe to PushManager
→ Send subscription endpoint to backend
→ Backend sends push via Firebase Cloud Messaging (FCM) or Web Push API
```

**BRUTAL CALL-OUT: Push notifications require: (a) VAPID key pair for Web Push, (b) FCM/APNs setup for mobile, (c) backend endpoint to store subscriptions, (d) backend job to send pushes, (e) Service Worker to handle push events. Zero exists. The notification system is Socket.IO only — no push infrastructure.**

### UI: Push Notification Prompt

```
┌──────────────────────────────────────┐
│  🔔  Stay in the loop               │
│  Get notified when you're mentioned, │
│  assigned, or something needs your   │
│  attention — even when you're away.  │
│                                      │
│  [Not Now]      [Enable Notifications]│
└──────────────────────────────────────┘
```

- Prompt appears once per session if: (a) Notification API is supported, (b) permission is not already granted or denied, (c) user has been active for >30 seconds.
- **Not Now**: dismisses prompt, shows again next session.
- **Enable**: triggers Notification.requestPermission(). On grant: subscribe PushManager, POST to /api/push/subscriptions — ❌ **new endpoint.**
- **Denied**: never prompt again. Show "Notifications are disabled. Enable in browser settings." in notification preferences.

### Push Handling in Service Worker

```typescript
// Conceptual sw.js handler
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: data.actionUrl }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

---

## Mobile Responsive

### Breakpoints

| Breakpoint | Width | Layout Behavior |
|------------|-------|-----------------|
| **Desktop** | ≥1024px | Full multi-panel layouts as designed |
| **Tablet** | 640-1023px | Reduced sidebars, stacked panels |
| **Mobile** | <640px | Single-column, bottom nav, swipe gestures |

### Bottom Navigation (<640px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                          (Page Content)                                      │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  ☰ Boards  │  📋 Tasks  │  🔔 Inbox  │  👥 Team  │  ⚙️ More                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

- 5 tabs: Boards, Tasks, Inbox (with unread badge), Team, More (hamburger for remaining views).
- Active tab highlighted with primary color. Fixed at bottom, 64px height.
- Safe area padding for notched phones (`padding-bottom: env(safe-area-inset-bottom)`).
- **No bottom nav on desktop/tablet** — existing sidebar navigation persists.

### Touch Interactions

- **Swipe left on item row**: reveals "Complete" + "Delete" buttons. ❌ **Requires touch event handlers or use library (Hammer.js / use-gesture).**
- **Swipe right on notification**: marks as read.
- **Pull-to-refresh**: on boards list, inbox, employee list. Custom pull indicator (spinner + "Pull to refresh").
- **Long-press on item card**: opens context menu (same as right-click on desktop).
- **Tap target minimum**: 44×44px for all interactive elements (buttons, links, list items). Enforced in CSS.

### Responsive Component Adaptations

| Component | Desktop | Mobile (<640px) |
|-----------|---------|-----------------|
| Board View (Kanban) | Horizontal scroll columns | Single column, vertical stack. Tap column header to show items. |
| Item Detail | Slideover right panel | Full-screen modal (slides up from bottom). Close button top-right. |
| Data Tables | Multi-column sortable table | Card list (each row = card with key-value pairs). Sort/filter in header. |
| Employee List | Card grid, 3 columns | Single column list, avatar + name + role only. Tap for details. |
| Settings | Left nav + right content | Single page with collapsible sections. Back button in header. |
| Modals | Centered, 480px max | Full-screen, slides up from bottom. Title bar with Close + Save. |
| Composer | Slide-over from right | Full-screen modal. Keyboard-aware. |

### Mobile Meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

- `user-scalable=no` prevents accidental zoom on input focus — standard for web apps.
- PWA manifest (`manifest.json`) required for "Add to Home Screen." ❌ **Does not exist — create one with `start_url`, `display: standalone`, `orientation: portrait`, `icons`.**

---

## 99.9% Uptime SLA Indicators

### Status Badge in Footer/Header

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🟢 All Systems Operational                      │  99.96% uptime this month │
│  Last incident: May 10, 2026 (3m 42s downtime)   │  Current version: v2.4.1  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Status dot**: green (operational), yellow (degraded), red (outage).
- **Uptime percentage**: computed from incident log. Shown in footer and Settings → Billing.
- **Last incident**: from incident history. ❌ **Requires a status endpoint (GET /api/system/status) or hardcoded.**
- **Version**: from package.json or API response (GET /api/system/version — ❌ **does not exist**).

### SLA Compliance Page (Settings → Billing)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Service Level Agreement                    Plan: Enterprise                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Monthly Uptime                                 Current Month                │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                                                                   99.96% ││
│  │  ████████████████████████████████████████████████████████████████████░░░ ││
│  │  0                          15                         30               ││
│  │                                                                          ││
│  │  Target: 99.9% ● Met ✓                                                   ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Incident History                  Date              Duration  Impact        │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  Database connection pool exhausted     May 10, 2026   3m 42s   Partial ││
│  │  CDN configuration error               Apr 22, 2026   1m 15s   Minor    ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Credits (if SLA breach)                                                     │
│  No breaches this quarter. Eligible credits: 0%                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

**BRUTAL CALL-OUT: SLA tracking requires a backend incident log and uptime calculation. This is purely a presentation layer for data that likely doesn't exist. Without an uptime monitoring system, this page should show a static message: "SLA data is updated at the end of each month."**

---

## States

### Global Offline State (App-Level)

When the browser detects `navigator.onLine === false`:
- All dynamic content shows cached data with "Offline" watermark (translucent, diagonally).
- Create/edit buttons are disabled or show warning tooltip: "You're offline. Changes will sync when reconnected."
- Toasts queue: "Change saved offline. Will sync when connection is restored."
- Socket indicator: red dot with "Disconnected" text.

### Global Loading State (SSO/Permissions Placeholders)

For enterprise feature placeholders (SSO, field-level permissions):
- Show a "card" with the feature name, a lock icon, and text: "Enterprise Feature — Contact sales for early access."
- No skeleton loading — these are static pages.

### Error State (Audit Log)

- "Audit log is unavailable. This feature may not be enabled on your plan."
- Retry button that re-fetches GET /api/settings/audit-logs.
- If 403: "You don't have permission to view audit logs. Contact your workspace admin."

---

## BRUTAL CALL-OUTS — Full Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **Workspace roles (owner/admin/manager/member/viewer)** | ✅ Full backend | None |
| **Workspace member management** | ✅ Full backend | None |
| **Audit log viewer** | ✅ Full backend | None |
| **Item version field** | ✅ Exists | Supports optimistic concurrency |
| **Soft delete (items)** | ❌ **No endpoint** | Add `deleted_at` column + trash endpoints |
| **Soft delete (boards)** | ❌ **No endpoint** | Same as items |
| **Trash restore** | ❌ **Does not exist** | POST /api/trash/{id}/restore needed |
| **Retention policy config** | ❌ **Does not exist** | Workspace settings field + cron job |
| **SSO (SAML/OIDC)** | ❌ **Does not exist** | Full auth infrastructure needed |
| **SCIM provisioning** | ❌ **Does not exist** | SCIM server endpoints + sync engine |
| **JIT provisioning** | ❌ **Does not exist** | Tied to SSO implementation |
| **Project-level permissions** | ❌ **Does not exist** | Per-board visibility/editing model |
| **Field-level permissions** | ❌ **Does not exist** | Role-field permission matrix + middleware |
| **Offline mode (Service Worker)** | ❌ **Does not exist** | New SW + IndexedDB + sync engine |
| **Offline mutation queue** | ❌ **Does not exist** | IndexedDB queue + conflict resolution |
| **Push notifications** | ❌ **Does not exist** | Web Push API + FCM + subscription storage |
| **PWA manifest** | ❌ **Does not exist** | Create manifest.json |
| **Add to Home Screen** | ❌ **Does not exist** | Depends on manifest + SW |
| **Mobile bottom nav** | ⚠️ Frontend | CSS/layout only — no backend dependency |
| **Touch/swipe gestures** | ⚠️ Frontend | Library integration only |
| **SLA status page** | ❌ **No data source** | Needs incident monitoring system |
| **System version endpoint** | ❌ **Does not exist** | GET /api/system/version needed |

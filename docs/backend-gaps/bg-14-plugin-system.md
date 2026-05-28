# BG-14: Plugin System & Marketplace

**Status:** NOT IMPLEMENTED | **Priority:** P2 | **Complexity:** HIGH

---

## 1. What the Feature Is

A plugin architecture allowing third-party developers to extend NexusFlow functionality. Includes a plugin registry, lifecycle management (install/uninstall/enable/disable), an event/webhook system for plugin hooks, permission scoping, and a marketplace UI for discovering and installing plugins. This is the platform play — the difference between "a project management app" and "a platform."

Examples: Time tracking plugin, Gantt chart plugin, SLA tracking plugin, GitHub integration plugin, custom dashboard widgets.

## 2. Why It's Missing

| Reason | Detail |
|--------|--------|
| **Sandboxing is hard** | Server-side plugin execution requires a sandboxed runtime. Node.js `vm` module is leaky. Docker containers per plugin is heavy. WebAssembly is immature. There's no safe way to run arbitrary third-party code on the server. |
| **Event system doesn't exist** | The automation engine has triggers/actions, but there's no general-purpose event bus that plugins can subscribe to. Building one means retrofitting every controller to emit events — `item.created`, `user.assigned`, `status.changed`, etc. |
| **Security model undefined** | What permissions can a plugin request? Can a plugin read all tasks? Write to them? Delete data? Access user emails? There's no permission system granular enough to scope plugin access. Current RBAC is workspace-level only. |
| **Marketplace infrastructure** | Where do plugins live? A registry (npm-like) needs hosting, versioning, download tracking, deprecation. A private marketplace needs access control. Neither exists. |
| **No plugin manifest standard** | No JSON schema for plugin metadata (name, version, permissions, hooks, config schema). No validation pipeline. No signature/verification mechanism. |
| **Frontend extensions are harder** | Plugins that add UI (custom fields, dashboard widgets) need a frontend extension mechanism. This means iframe sandboxing or WebComponent-based plugin slots. Neither is built. |

**Hard truth:** A plugin system is the kind of feature that sounds straightforward ("just let people add features!") but is an architectural nightmare. Every other system needs to be hardened first. Realistically, this is 3-4 months of work to get to a minimum viable plugin system. The smart play is to build the event system first, then expose webhooks, then allow serverless function plugins, then add UI extensions last.

## 3. Full Backend Spec

### 3.1 Data Models

```sql
-- Plugin registry (master list of all available plugins)
CREATE TABLE plugins (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              VARCHAR(100) NOT NULL UNIQUE,  -- 'github-integration', 'time-tracker'
    name              VARCHAR(255) NOT NULL,
    description       TEXT NOT NULL,
    long_description  TEXT,
    version           VARCHAR(20) NOT NULL,           -- semver
    author            VARCHAR(255) NOT NULL,
    author_url        VARCHAR(500),
    homepage_url      VARCHAR(500),
    icon_url          VARCHAR(500),
    screenshots       TEXT[],                          -- array of URLs
    category          VARCHAR(50) NOT NULL,            -- 'integration', 'widget', 'utility', 'report'
    tags              VARCHAR(50)[],
    permissions       JSONB NOT NULL DEFAULT '[]',     -- requested permissions (see 3.2)
    config_schema     JSONB,                           -- JSON Schema for plugin settings
    hooks             JSONB NOT NULL DEFAULT '[]',     -- subscribed events/hooks
    is_official       BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
    download_count    INTEGER NOT NULL DEFAULT 0,
    rating_avg        DECIMAL(2,1) DEFAULT 0.0,
    rating_count      INTEGER NOT NULL DEFAULT 0,
    min_api_version   VARCHAR(20),
    max_api_version   VARCHAR(20),
    source_type       VARCHAR(20) NOT NULL DEFAULT 'registry',  -- 'registry', 'workspace_custom', 'url'
    source_url        VARCHAR(500),                   -- for 'url' type plugins (self-hosted)
    checksum          VARCHAR(64),                    -- SHA-256 of plugin bundle
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-workspace plugin installation
CREATE TABLE plugin_installations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id         UUID NOT NULL REFERENCES plugins(id),
    workspace_id      UUID NOT NULL REFERENCES workspaces(id),
    enabled           BOOLEAN NOT NULL DEFAULT TRUE,
    config_json       JSONB DEFAULT '{}',              -- workspace-specific configuration
    installed_by      UUID NOT NULL REFERENCES users(id),
    installed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(plugin_id, workspace_id)
);

CREATE INDEX idx_plugin_installations_workspace ON plugin_installations(workspace_id, enabled);

-- Plugin event subscriptions (what events a plugin listens to)
CREATE TABLE plugin_event_subscriptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id   UUID NOT NULL REFERENCES plugin_installations(id) ON DELETE CASCADE,
    event_type        VARCHAR(100) NOT NULL,           -- 'item.created', 'item.updated', 'user.assigned'
    handler           VARCHAR(255) NOT NULL,           -- function/endpoint to call
    filter_condition  JSONB,                           -- optional: only fire when condition met
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plugin_events_installation ON plugin_event_subscriptions(installation_id);

-- Plugin event log (for debugging and audit)
CREATE TABLE plugin_event_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id   UUID NOT NULL REFERENCES plugin_installations(id),
    event_type        VARCHAR(100) NOT NULL,
    payload           JSONB,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'success', 'failed', 'timeout'
    response          JSONB,
    error_message     TEXT,
    duration_ms       INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plugin_event_log_installation ON plugin_event_log(installation_id, created_at DESC);

-- Plugin ratings and reviews
CREATE TABLE plugin_reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id         UUID NOT NULL REFERENCES plugins(id),
    user_id           UUID NOT NULL REFERENCES users(id),
    rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(plugin_id, user_id)
);
```

### 3.2 Permission Model

Each plugin declares required permissions in its manifest. Permissions are granular:

```json
{
  "permissions": [
    {
      "name": "items:read",
      "description": "Read tasks and items",
      "scope": "workspace",
      "required": true
    },
    {
      "name": "items:write",
      "description": "Create and update tasks",
      "scope": "workspace",
      "required": false
    },
    {
      "name": "users:read",
      "description": "View workspace members",
      "scope": "workspace",
      "required": true
    },
    {
      "name": "webhooks:manage",
      "description": "Register webhook endpoints",
      "scope": "workspace",
      "required": false
    }
  ]
}
```

**Permission Categories:**

| Category | Permissions |
|----------|-------------|
| items: | read, write, delete, read_all_fields, override_assignee |
| lists: | read, write, delete |
| comments: | read, write, delete |
| users: | read, read_email, read_profile |
| workspace: | read_settings, write_settings, manage_members |
| automation: | read_rules, write_rules, execute_actions |
| webhooks: | manage, receive |
| admin: | all (never granted to non-official plugins) |

**Permission Enforcement:**
- Each plugin API call includes `X-Plugin-ID` header
- Middleware checks: does this plugin have `items:read` permission in this workspace?
- Denied calls return `403 PLUGIN_PERMISSION_DENIED`
- Permission changes require re-installation (user must approve new permissions)

### 3.3 Event System

The event bus is the backbone of the plugin system. Every meaningful action emits an event:

```yaml
Events to implement (retrofit):
  item.created:        { item_id, workspace_id, list_id, creator_id, data }
  item.updated:        { item_id, workspace_id, changes: { field: { old, new } } }
  item.deleted:        { item_id, workspace_id }
  item.status_changed: { item_id, workspace_id, from_status, to_status }
  item.assigned:       { item_id, workspace_id, assignee_id, unassigned: bool }
  comment.created:     { comment_id, item_id, workspace_id, author_id, body }
  comment.updated:     { comment_id, changes }
  comment.deleted:     { comment_id }
  user.joined:         { workspace_id, user_id, role }
  user.left:           { workspace_id, user_id }
  automation.triggered: { rule_id, workspace_id, item_id, action_executed }
  list.created:        { list_id, workspace_id, name }
  list.archived:       { list_id, workspace_id }

Event delivery:
  1. Event is emitted → stored in event_log
  2. Plugin subscriptions matching event_type are collected
  3. For each subscription:
     a. Check filter_condition against event payload
     b. Call handler (HTTP webhook or internal function)
     c. Record result in plugin_event_log
     d. Timeout after 30s → mark as 'timeout'
  4. For UI-impacting plugins, a WebSocket message is sent to connected clients
```

### 3.4 API Endpoints

```yaml
# ── Marketplace (Registry) ───────────────────────────────────

GET /api/plugins/marketplace
  Query: ?category=integration&search=github&sort=downloads&page=1&limit=20
  Response: {
    data: [{
      id, slug, name, description, version, author, icon_url,
      category, tags, is_official, is_verified,
      download_count, rating_avg, rating_count,
      installed: true|false,  -- based on current workspace
      enabled: true|false
    }],
    total: number,
    page: number
  }

GET /api/plugins/marketplace/{slug}
  Response: {
    data: Plugin (full detail: long_description, screenshots, permissions, config_schema, hooks, reviews)
  }

# ── Workspace Installations ──────────────────────────────────

GET /api/plugins/installed
  Query: ?workspace_id=xxx&enabled=true
  Response: { data: PluginInstallation[] }

POST /api/plugins/{id}/install
  Body: { workspace_id: UUID, config_json?: {} }
  Response: { data: PluginInstallation }
  Logic:
    1. Verify plugin exists and is compatible (API version check)
    2. Check workspace doesn't already have it installed
    3. Verify current user has admin/owner role in workspace
    4. Log permission consent (which permissions are being granted)
    5. Create plugin_installation row
    6. Initialize plugin (call plugin's `onInstall` hook if exists)
    7. Increment plugin.download_count
  Errors: 409 if already installed, 403 if not admin, 400 if incompatible

POST /api/plugins/{id}/uninstall
  Body: { workspace_id: UUID }
  Response: { success: true }
  Logic:
    1. Call plugin's `onUninstall` hook
    2. Clean up plugin data (what data? Need per-plugin cleanup contract)
    3. Delete plugin_installation row
    4. Delete associated event subscriptions and log entries
  Errors: 404 if not installed

PUT /api/plugins/{id}/toggle
  Body: { workspace_id: UUID, enabled: boolean }
  Response: { data: PluginInstallation }
  Logic:
    1. Toggle enabled flag
    2. Call plugin's `onEnable` or `onDisable` hook
    3. If enabling: register event subscriptions
    4. If disabling: unregister event subscriptions

PUT /api/plugins/{id}/settings
  Body: { workspace_id: UUID, config_json: {} }
  Response: { data: PluginInstallation }
  Logic:
    1. Validate config_json against plugin.config_schema (JSON Schema validation)
    2. Update plugin_installation.config_json
    3. Call plugin's `onSettingsChanged` hook with old + new config

# ── Plugin Reviews ────────────────────────────────────────────

GET /api/plugins/{id}/reviews
  Query: ?page=1&limit=10
  Response: { data: PluginReview[], rating_summary: { 1: n, 2: n, 3: n, 4: n, 5: n, avg: number } }

POST /api/plugins/{id}/reviews
  Body: { rating: number, review_text?: string }
  Response: { data: PluginReview }

# ── Plugin Developer (Registry Management) ───────────────────

POST /api/plugins/register  (admin/owner only)
  Body: { slug, name, description, config_schema, permissions, hooks, ... }
  Response: { data: Plugin }
  Notes: For publishing a plugin to the marketplace. Requires authentication.

PUT /api/plugins/{id}  (owner only)
  Body: { version?, description?, config_schema?, ... }
  Response: { data: Plugin }
  Notes: Update plugin metadata. Version bumps trigger update notifications to installations.

DELETE /api/plugins/{id}  (owner only)
  Response: { success: true }
  Notes: Soft-delete. Plugin remains on installed workspaces but removed from marketplace.

# ── Plugin Logs (Debugging) ──────────────────────────────────

GET /api/plugins/installed/{installationId}/logs
  Query: ?status=failed&page=1&limit=50
  Response: { data: PluginEventLog[] }
  Notes: For workspace admins debugging plugin issues.

POST /api/plugins/installed/{installationId}/logs/clear
  Response: { count: number }
```

### 3.5 Plugin Lifecycle

```
                    ┌─────────────┐
                    │   REGISTRY   │
                    │  (published) │
                    └──────┬──────┘
                           │ install
                           ▼
                    ┌─────────────┐
               ┌─── │  INSTALLED  │
               │    │  (disabled) │
               │    └──────┬──────┘
               │           │ enable
               │           ▼
               │    ┌─────────────┐
          toggle│    │  ENABLED    │◄──── active event subscriptions
               │    │  (running)  │
               │    └──────┬──────┘
               │           │ disable
               │    ┌──────┴──────┐
               │    │  DISABLED   │
               │    └──────┬──────┘
               │           │
               │           │ uninstall
               │           ▼
               │    ┌─────────────┐
               └──► │  REMOVED    │
                    └─────────────┘

  State transitions:
    REGISTRY  → INSTALLED:  User installs plugin
    INSTALLED → ENABLED:    User enables plugin (or auto-enable on install)
    ENABLED   → DISABLED:   User disables plugin (events paused, UI hidden)
    DISABLED  → ENABLED:    User re-enables plugin
    ENABLED   → REMOVED:    User uninstalls (requires disable first, or force)
    DISABLED  → REMOVED:    User uninstalls
    INSTALLED → REMOVED:    User uninstalls before first enable
```

## 4. Frontend Design

### 4.1 Plugin Marketplace Page

```
┌─────────────────────────────────────────────────────────────┐
│ Plugin Marketplace                                      [My Plugins] │
├─────────────────────────────────────────────────────────────┤
│ [Search plugins...]        Category: [All ▼]  Sort: [Popular ▼] │
│                                                               │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│ │ [icon]        │  │ [icon]        │  │ [icon]        │        │
│ │ GitHub Sync   │  │ Time Tracker  │  │ Gantt Charts  │        │
│ │ Sync tasks    │  │ Track time    │  │ Timeline view │        │
│ │ with GitHub   │  │ per task      │  │ for projects  │        │
│ │               │  │               │  │               │        │
│ │ ★★★★☆ 2.5k   │  │ ★★★☆☆ 1.2k   │  │ ★★★★☆ 890    │        │
│ │ [Install]     │  │ [Install]     │  │ [Installed ✓] │        │
│ └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│ │ [icon]        │  │ [icon]        │  │ [icon]        │        │
│ │ SLA Monitor   │  │ Custom Fields │  │ Webhooks Pro  │        │
│ │ Track SLA     │  │ Add custom    │  │ Advanced      │        │
│ │ compliance    │  │ field types   │  │ webhook mgmt  │        │
│ │               │  │               │  │               │        │
│ │ ★★★☆☆ 340    │  │ ★★★★☆ 1.8k   │  │ ★★★☆☆ 560    │        │
│ │ [Install]     │  │ [Install]     │  │ [Install]     │        │
│ └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
│                                                       Page 1 of 8 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Plugin Detail Page

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Marketplace                                        │
│                                                               │
│ [Large Icon]  GitHub Sync                            [Install] │
│ Version 2.1.0 · by NexusFlow · 2,500+ downloads              │
│ ★★★★☆ (48 reviews)                              [Share]      │
│                                                               │
│ Sync tasks, issues, and projects bidirectionally with GitHub. │
│ Automatically create branches from tasks, update status from  │
│ PRs, and link commits to work items.                          │
│                                                               │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ [Screenshot 1]  [Screenshot 2]  [Screenshot 3]            │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ Permissions Requested:                                        │
│ ✓ Read tasks and items                                        │
│ ✓ Create and update tasks                                     │
│ ✓ View workspace members                                      │
│ ✓ Register webhook endpoints                                  │
│                                                               │
│ What's new in 2.1.0:                                         │
│ • Support for GitHub Projects v2                              │
│ • Improved error handling for large repos                     │
│ • Bug fix: duplicate sync on status change                    │
│                                                               │
│ ── Reviews ──                                                  │
│ ★★★★★ "Essential for engineering teams" - @alice           │
│ ★★★★☆ "Works great but setup is complex" - @bob              │
│                                                               │
│ [Write a review]                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Installed Plugins List

```
┌─────────────────────────────────────────────────────────────┐
│ Installed Plugins                          [Browse Marketplace] │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [icon] GitHub Sync              ● Enabled    [⚙] [⋮]    │ │
│ │ v2.1.0 · by NexusFlow · Installed Jan 10, 2025          │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Last event: 5m ago · Logs: 1 error in last 24h [View]   │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [icon] Time Tracker            ○ Disabled   [⚙] [⋮]    │ │
│ │ v1.3.0 · by ThirdParty · Installed Dec 5, 2024           │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Enable to start tracking time on tasks.                  │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [icon] Custom Fields           ● Enabled    [⚙] [⋮]    │ │
│ │ v2.0.1 · by NexusFlow · Installed Nov 20, 2024           │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ No recent events                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Plugin Settings Form (Auto-generated from config_schema)

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Sync Settings                                         │
│                                                               │
│ [GitHub Personal Access Token]                                │
│ [  [●] [●] [●] [●] [●] [●] [●] [●] [●] [●] [●] [●] [●]  ] │
│ ⚠ Token needs repo, issues, and pull requests scopes          │
│                                                               │
│ [Repository] [nexusflow/nexusflow ▼]                          │
│                                                               │
│ Sync Direction:                                               │
│ ○ GitHub → NexusFlow (one-way)                                │
│ ● Bidirectional                                                │
│ ○ NexusFlow → GitHub (one-way)                                │
│                                                               │
│ [✓] Auto-create branches from tasks                           │
│ [✓] Update task status when PR is merged                      │
│ [ ] Sync issue comments                                       │
│                                                               │
│ Default status mapping:                                        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ NexusFlow Status │ GitHub Label           │              │ │
│ │ Backlog          │ status/backlog         │    [✕]      │ │
│ │ In Progress      │ status/in-progress     │    [✕]      │ │
│ │ Review           │ status/review          │    [✕]      │ │
│ │ Done             │ status/done            │    [✕]      │ │
│ └──────────────────────────────────────────────────────────┘ │
│ [Add mapping]                                                 │
│                                                               │
│  [Save]  [Disable Plugin]  [Uninstall Plugin]                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Permission Consent Dialog (On Install)

```
┌──────────────────────────────────────────┐
│ Install "GitHub Sync"?                     │
│                                             │
│ This plugin will receive the following      │
│ permissions in this workspace:              │
│                                             │
│ ☑ Read all tasks and items                  │
│ ☑ Create and update tasks and items         │
│ ☑ View workspace members and their emails   │
│ ☑ Register and manage webhook endpoints     │
│                                             │
│ You can revoke these anytime from settings. │
│                                             │
│ [Cancel]  [Install & Grant Permissions]     │
└──────────────────────────────────────────┘
```

### 4.6 States Enumeration

| State | Behavior |
|-------|----------|
| **No plugins installed** | Empty state with "Browse Marketplace" CTA |
| **Update available** | Badge on plugin card: "Update to v2.2.0" with one-click update |
| **Plugin error** | Red badge: "Plugin encountered errors. [View logs]" |
| **Plugin incompatible** | Warning: "This plugin requires API v2.0+. Current: v1.5. Updates available." |
| **Permission changed** | Alert: "Plugin '{name}' is requesting new permissions. [Review]" |
| **Marketplace loading** | Skeleton grid (6 card placeholders with shimmer) |
| **Marketplace error** | "Marketplace unavailable. [Retry]" with offline fallback |

### 4.7 Error Handling

| Error | Frontend | Backend |
|-------|----------|---------|
| **Plugin timeout** | "Plugin did not respond. Disabling." | Mark as disabled after 3 consecutive timeouts |
| **Plugin crash** | "Plugin encountered an error. [View] [Disable] [Report]" | Capture stack trace, disable plugin, notify admin |
| **Permission denied** | "Plugin attempted access to {resource} without permission." | Log security event, notify workspace admin |
| **Config validation** | Inline validation errors under each settings field | Return JSON Schema validation errors |
| **Rate limit** | "Plugin exceeded rate limit. Temporarily disabled." | Auto-disable for 5 minutes after 1000 requests/min |

---

**Implementation estimate:** 3-4 months (MVP: 6-8 weeks)
**Dependencies:** Event system (retrofit all controllers), Permission system (bg-15), Frontend extension mechanism
**Risk:** EXTREME. This is a platform play that touches every system. The MVP should be scoped to: (1) event system, (2) webhook-only plugins (no server-side code), (3) static UI extensions. No sandboxed execution until v2.

# FlowOS — Multi-Tenant Database Schema

**Version**: 1.1
**Database**: PostgreSQL 15
**Tenant Isolation**: Row-Level Security (RLS) on all tenant tables
**Migrations**: Laravel migrations (PHP) — zero-downtime expand-contract pattern

> **Changelog v1.1**: Added 13 missing tables/columns identified in gap analysis:
> `password_history` + `totp_backup_codes` columns on `users`; new tables
> `workspace_invitations`, `oauth_tokens`, `magic_link_tokens`,
> `document_permissions`, `board_templates`, `time_entries`,
> `github_integrations`, `sprints`, `plan_limits`, `workspace_addons`,
> `realtime_events`; `ai_score` + `ai_score_reasoning` + `ai_score_updated_at`
> columns on `crm_deals`.

---

## 1. Core Tenant Tables

```sql
-- ═══════════════════════════════════════════════
-- WORKSPACES (one per company — the tenant root)
-- ═══════════════════════════════════════════════
CREATE TABLE workspaces (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    slug                    VARCHAR(100) UNIQUE NOT NULL,
    logo_url                TEXT,
    cover_url               TEXT,
    custom_domain           VARCHAR(255),
    timezone                VARCHAR(100) DEFAULT 'UTC',
    plan                    VARCHAR(50) DEFAULT 'free',
    plan_status             VARCHAR(50) DEFAULT 'active',
    trial_ends_at           TIMESTAMPTZ,
    subscription_id_stripe  VARCHAR(255),
    subscription_id_payfast VARCHAR(255),
    customer_id_stripe      VARCHAR(255),
    seat_count              INT DEFAULT 1,
    storage_quota_bytes     BIGINT DEFAULT 524288000,
    storage_used_bytes      BIGINT DEFAULT 0,
    automations_quota       INT DEFAULT 50,
    automations_used        INT DEFAULT 0,
    automations_reset_at    TIMESTAMPTZ,
    ai_credits_quota        INT DEFAULT 100,
    ai_credits_used         INT DEFAULT 0,
    ai_credits_reset_at     TIMESTAMPTZ,
    settings                JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_plan ON workspaces(plan);
CREATE INDEX idx_workspaces_custom_domain ON workspaces(custom_domain) WHERE custom_domain IS NOT NULL;


-- ═══════════════════════════════════════════════
-- USERS (global — one user can belong to many workspaces)
-- Added v1.1: password_history, totp_backup_codes
-- ═══════════════════════════════════════════════
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at   TIMESTAMPTZ,
    password_hash       VARCHAR(255),
    password_history    JSONB DEFAULT '[]',
    avatar_url          TEXT,
    locale              VARCHAR(20) DEFAULT 'en',
    timezone            VARCHAR(100) DEFAULT 'UTC',
    two_factor_secret   VARCHAR(255),
    two_factor_enabled  BOOLEAN DEFAULT FALSE,
    totp_backup_codes   JSONB DEFAULT '[]',
    last_seen_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);


-- ═══════════════════════════════════════════════
-- WORKSPACE MEMBERS (user <-> workspace join)
-- ═══════════════════════════════════════════════
CREATE TABLE workspace_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(50) DEFAULT 'member',
    status          VARCHAR(50) DEFAULT 'active',
    invited_by      UUID REFERENCES users(id),
    joined_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);


-- ═══════════════════════════════════════════════
-- WORKSPACE INVITATIONS (NEW v1.1)
-- Pending email invitations before the invitee creates an account.
-- Referenced by: invite member flow, plan seat-limit enforcement.
-- ═══════════════════════════════════════════════
CREATE TABLE workspace_invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    role            VARCHAR(50) DEFAULT 'member',
    token           VARCHAR(100) UNIQUE NOT NULL,
    invited_by      UUID NOT NULL REFERENCES users(id),
    expires_at      TIMESTAMPTZ NOT NULL,
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, email)
);

CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token)
    WHERE accepted_at IS NULL;
CREATE INDEX idx_workspace_invitations_workspace ON workspace_invitations(workspace_id)
    WHERE accepted_at IS NULL;


-- ═══════════════════════════════════════════════
-- OAUTH TOKENS (NEW v1.1)
-- AES-256-GCM encrypted OAuth tokens per user per provider.
-- Referenced by: SECURITY.md §2 OAuth, GDPR purge job.
-- NOT RLS protected — per-user, not per-workspace.
-- ═══════════════════════════════════════════════
CREATE TABLE oauth_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(50) NOT NULL,
    provider_user_id    VARCHAR(255) NOT NULL,
    access_token        TEXT NOT NULL,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    scopes              TEXT[],
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, provider)
);

CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);


-- ═══════════════════════════════════════════════
-- MAGIC LINK TOKENS (NEW v1.1)
-- Single-use passwordless login tokens (15-minute TTL).
-- Referenced by: ARCHITECTURE.md §5, POST /auth/magic-link.
-- NOT RLS protected — global auth table.
-- ═══════════════════════════════════════════════
CREATE TABLE magic_link_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(100) UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    ip_address  INET,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_magic_link_tokens_token ON magic_link_tokens(token)
    WHERE used_at IS NULL;
```

---

## 2. Board & Task Tables (RLS enabled)

```sql
-- ═══════════════════════════════════════════════
-- BOARDS
-- ═══════════════════════════════════════════════
CREATE TABLE boards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    icon            VARCHAR(50),
    color           VARCHAR(20),
    type            VARCHAR(50) DEFAULT 'main',
    visibility      VARCHAR(50) DEFAULT 'workspace',
    default_view    VARCHAR(50) DEFAULT 'kanban',
    position        FLOAT NOT NULL DEFAULT 0,
    settings        JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON boards
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_boards_workspace ON boards(workspace_id) WHERE deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- BOARD TEMPLATES (NEW v1.1)
-- Pre-built and AI-generated board templates (300+ library).
-- Global rows (workspace_id IS NULL) = platform templates.
-- Workspace rows = custom saved templates.
-- Referenced by: FEATURES.md §1.5, POST /boards (template_id param).
-- ═══════════════════════════════════════════════
CREATE TABLE board_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    icon            VARCHAR(50),
    cover_url       TEXT,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    columns         JSONB NOT NULL DEFAULT '[]',
    groups          JSONB NOT NULL DEFAULT '[]',
    automations     JSONB DEFAULT '[]',
    is_public       BOOLEAN DEFAULT TRUE,
    usage_count     INT DEFAULT 0,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON board_templates
    USING (workspace_id IS NULL OR workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_board_templates_category ON board_templates(category) WHERE is_public = TRUE;
CREATE INDEX idx_board_templates_workspace ON board_templates(workspace_id)
    WHERE workspace_id IS NOT NULL;


-- ═══════════════════════════════════════════════
-- COLUMNS (custom fields per board)
-- ═══════════════════════════════════════════════
CREATE TABLE board_columns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL,
    position        FLOAT NOT NULL DEFAULT 0,
    width           INT DEFAULT 200,
    settings        JSONB DEFAULT '{}',
    is_system       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON board_columns
    USING (workspace_id = current_setting('app.workspace_id')::uuid);


-- ═══════════════════════════════════════════════
-- GROUPS / SECTIONS within a board
-- ═══════════════════════════════════════════════
CREATE TABLE board_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL DEFAULT 'New Group',
    color           VARCHAR(20),
    position        FLOAT NOT NULL DEFAULT 0,
    collapsed       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE board_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON board_groups
    USING (workspace_id = current_setting('app.workspace_id')::uuid);


-- ═══════════════════════════════════════════════
-- ITEMS (tasks/cards)
-- ═══════════════════════════════════════════════
CREATE TABLE items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    group_id        UUID NOT NULL REFERENCES board_groups(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES items(id) ON DELETE CASCADE,
    title           TEXT NOT NULL DEFAULT 'New Item',
    description     JSONB,
    position        FLOAT NOT NULL DEFAULT 0,
    status          VARCHAR(100),
    priority        VARCHAR(20),
    due_date        TIMESTAMPTZ,
    reminder_at     TIMESTAMPTZ,
    estimated_hours NUMERIC(8,2),
    tracked_hours   NUMERIC(8,2) DEFAULT 0,
    column_values   JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON items
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_items_board ON items(board_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_group ON items(group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_parent ON items(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_items_workspace ON items(workspace_id);
CREATE INDEX idx_items_due_date ON items(due_date) WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_items_column_values ON items USING GIN(column_values);


-- ═══════════════════════════════════════════════
-- ITEM ASSIGNEES
-- ═══════════════════════════════════════════════
CREATE TABLE item_assignees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    assigned_by     UUID REFERENCES users(id),
    assigned_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (item_id, user_id)
);

ALTER TABLE item_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON item_assignees
    USING (workspace_id = current_setting('app.workspace_id')::uuid);


-- ═══════════════════════════════════════════════
-- ITEM DEPENDENCIES
-- ═══════════════════════════════════════════════
CREATE TABLE item_dependencies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    depends_on_id   UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    type            VARCHAR(50) DEFAULT 'finish_to_start',
    UNIQUE (item_id, depends_on_id)
);

ALTER TABLE item_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON item_dependencies
    USING (workspace_id = current_setting('app.workspace_id')::uuid);


-- ═══════════════════════════════════════════════
-- TIME ENTRIES (NEW v1.1)
-- Individual start/stop timer records per item.
-- Referenced by: FEATURES.md §1.3 (Time tracking column),
--                PRICING §1 (Standard+ only), Automation trigger #14.
-- ═══════════════════════════════════════════════
CREATE TABLE time_entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id     UUID NOT NULL REFERENCES workspaces(id),
    item_id          UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id),
    started_at       TIMESTAMPTZ NOT NULL,
    stopped_at       TIMESTAMPTZ,
    duration_seconds INT GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (COALESCE(stopped_at, NOW()) - started_at))::INT
    ) STORED,
    note             TEXT,
    is_manual        BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON time_entries
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_time_entries_item ON time_entries(item_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id, workspace_id);
CREATE INDEX idx_time_entries_running ON time_entries(user_id) WHERE stopped_at IS NULL;


-- ═══════════════════════════════════════════════
-- SPRINTS (NEW v1.1)
-- Sprint containers for Sprint Board type (Dev plan).
-- Referenced by: FEATURES.md §Product 4, AI_STRATEGY.md §3.5.
-- ═══════════════════════════════════════════════
CREATE TABLE sprints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    goal            TEXT,
    status          VARCHAR(50) DEFAULT 'planning',
    start_date      DATE,
    end_date        DATE,
    velocity        NUMERIC(8,2),
    created_by      UUID NOT NULL REFERENCES users(id),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sprints
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_sprints_board ON sprints(board_id);
CREATE INDEX idx_sprints_status ON sprints(workspace_id, status);


-- ═══════════════════════════════════════════════
-- GITHUB INTEGRATIONS (NEW v1.1)
-- GitHub repo <-> Sprint Board connection (Pro+ plan).
-- Referenced by: FEATURES.md §1.1 (Sprint Board), PRICING §1 (Pro+),
--                Automation triggers #15-#17.
-- ═══════════════════════════════════════════════
CREATE TABLE github_integrations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    board_id            UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    github_repo_id      BIGINT NOT NULL,
    repo_full_name      VARCHAR(500) NOT NULL,
    installation_id     BIGINT NOT NULL,
    access_token        TEXT NOT NULL,
    token_expires_at    TIMESTAMPTZ,
    branch_filter       TEXT[],
    sync_prs            BOOLEAN DEFAULT TRUE,
    sync_commits        BOOLEAN DEFAULT TRUE,
    sync_issues         BOOLEAN DEFAULT FALSE,
    last_synced_at      TIMESTAMPTZ,
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, board_id, github_repo_id)
);

ALTER TABLE github_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON github_integrations
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_github_integrations_board ON github_integrations(board_id);
```

---

## 3. Comments, Activity, Files

```sql
-- ═══════════════════════════════════════════════
-- COMMENTS (on items, docs, anywhere)
-- ═══════════════════════════════════════════════
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    parent_id       UUID REFERENCES comments(id),
    body            JSONB NOT NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON comments
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id) WHERE deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- ACTIVITY LOG (every state change)
-- ═══════════════════════════════════════════════
CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    actor_id        UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON activity_log
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_workspace_created ON activity_log(workspace_id, created_at DESC);


-- ═══════════════════════════════════════════════
-- FILES (storage)
-- ═══════════════════════════════════════════════
CREATE TABLE files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    entity_type     VARCHAR(50),
    entity_id       UUID,
    name            VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(255) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    storage_path    TEXT NOT NULL,
    url             TEXT,
    thumbnail_url   TEXT,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON files
    USING (workspace_id = current_setting('app.workspace_id')::uuid);
```

---

## 4. Documents

```sql
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    title           VARCHAR(500) NOT NULL DEFAULT 'Untitled',
    content         JSONB,
    ydoc_state      BYTEA,
    folder_id       UUID REFERENCES document_folders(id),
    board_id        UUID REFERENCES boards(id),
    item_id         UUID REFERENCES items(id),
    visibility      VARCHAR(50) DEFAULT 'workspace',
    public_token    VARCHAR(100),
    icon            VARCHAR(50),
    cover_url       TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    last_edited_by  UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE TABLE document_folders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    name            VARCHAR(255) NOT NULL,
    parent_id       UUID REFERENCES document_folders(id),
    position        FLOAT DEFAULT 0,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_folders
    USING (workspace_id = current_setting('app.workspace_id')::uuid);


-- ═══════════════════════════════════════════════
-- DOCUMENT PERMISSIONS (NEW v1.1)
-- Per-document access overrides for restricted visibility docs.
-- Referenced by: FEATURES.md §Product 3 (share with specific members/guests).
-- ═══════════════════════════════════════════════
CREATE TABLE document_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    grantee_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission      VARCHAR(50) NOT NULL DEFAULT 'view',
    granted_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (document_id, grantee_id)
);

ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_permissions
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_document_permissions_grantee ON document_permissions(grantee_id, workspace_id);
```

---

## 5. CRM Tables

```sql
CREATE TABLE crm_contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    first_name      VARCHAR(255),
    last_name       VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(100),
    title           VARCHAR(255),
    company_id      UUID REFERENCES crm_companies(id),
    avatar_url      TEXT,
    tags            TEXT[],
    custom_fields   JSONB DEFAULT '{}',
    lead_score      SMALLINT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_contacts
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE TABLE crm_companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255),
    industry        VARCHAR(255),
    employee_count  INT,
    arr_usd         NUMERIC(14,2),
    logo_url        TEXT,
    custom_fields   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_companies
    USING (workspace_id = current_setting('app.workspace_id')::uuid);


-- ═══════════════════════════════════════════════
-- CRM DEALS
-- v1.1: added ai_score, ai_score_reasoning, ai_score_updated_at
-- Referenced by: AI_STRATEGY.md §3.4 (Lead Scoring — Claude 3.5 Sonnet,
--                score 0-100 + 3-bullet reasoning, refresh on every update
--                and daily background job).
-- ═══════════════════════════════════════════════
CREATE TABLE crm_deals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id),
    title               VARCHAR(500) NOT NULL,
    contact_id          UUID REFERENCES crm_contacts(id),
    company_id          UUID REFERENCES crm_companies(id),
    assigned_to         UUID REFERENCES users(id),
    stage               VARCHAR(100),
    value               NUMERIC(14,2),
    currency            VARCHAR(3) DEFAULT 'USD',
    probability         SMALLINT,
    close_date          DATE,
    won_at              TIMESTAMPTZ,
    lost_at             TIMESTAMPTZ,
    lost_reason         TEXT,
    custom_fields       JSONB DEFAULT '{}',
    ai_score            SMALLINT,
    ai_score_reasoning  TEXT,
    ai_score_updated_at TIMESTAMPTZ,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_deals
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_crm_deals_workspace ON crm_deals(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_deals_stage ON crm_deals(workspace_id, stage) WHERE deleted_at IS NULL;
```

---

## 6. Automation Tables

```sql
CREATE TABLE automations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    board_id        UUID REFERENCES boards(id),
    name            VARCHAR(255) NOT NULL,
    enabled         BOOLEAN DEFAULT TRUE,
    trigger_type    VARCHAR(100) NOT NULL,
    trigger_config  JSONB NOT NULL DEFAULT '{}',
    filters         JSONB NOT NULL DEFAULT '[]',
    actions         JSONB NOT NULL DEFAULT '[]',
    run_count       INT DEFAULT 0,
    last_run_at     TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON automations
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE TABLE automation_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    automation_id   UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL,
    trigger_data    JSONB,
    actions_log     JSONB,
    error_message   TEXT,
    duration_ms     INT,
    ran_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON automation_runs
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_automation_runs_workspace_ran ON automation_runs(workspace_id, ran_at DESC);
```

---

## 7. Notifications & Billing Tables

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    type            VARCHAR(100) NOT NULL,
    title           VARCHAR(500),
    body            TEXT,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notifications
    USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, workspace_id)
    WHERE read_at IS NULL;


CREATE TABLE billing_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    provider        VARCHAR(50) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    event_id        VARCHAR(255) UNIQUE NOT NULL,
    amount_cents    BIGINT,
    currency        VARCHAR(3),
    metadata        JSONB,
    processed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- NOT RLS protected — Super Admin needs full access
CREATE INDEX idx_billing_events_workspace ON billing_events(workspace_id);
CREATE INDEX idx_billing_events_event_id ON billing_events(event_id);


-- ═══════════════════════════════════════════════
-- PLAN LIMITS (NEW v1.1)
-- Static per-plan quota definitions. Seeded at migration time.
-- Super Admin can edit via Filament. Application code reads, never writes.
-- Referenced by: PRICING_AND_BILLING.md §1 + §7.
-- NOT RLS protected — global configuration.
-- ═══════════════════════════════════════════════
CREATE TABLE plan_limits (
    plan                    VARCHAR(50) PRIMARY KEY,
    max_seats               INT,
    max_boards              INT,
    max_items_per_board     INT,
    max_guests              INT,
    max_dashboards          INT,
    storage_quota_bytes     BIGINT NOT NULL,
    max_file_size_bytes     BIGINT NOT NULL,
    automations_per_month   INT,
    ai_credits_per_month    INT,
    has_time_tracking       BOOLEAN DEFAULT FALSE,
    has_github_integration  BOOLEAN DEFAULT FALSE,
    has_canvas_view         BOOLEAN DEFAULT FALSE,
    has_gantt_view          BOOLEAN DEFAULT FALSE,
    has_workload_view       BOOLEAN DEFAULT FALSE,
    has_sso                 BOOLEAN DEFAULT FALSE,
    has_white_label         BOOLEAN DEFAULT FALSE,
    has_custom_domain       BOOLEAN DEFAULT FALSE,
    has_api_access          BOOLEAN DEFAULT FALSE,
    api_access_level        VARCHAR(50),
    trial_days              INT DEFAULT 0
);

INSERT INTO plan_limits
    (plan, max_seats, max_boards, max_items_per_board, max_guests, max_dashboards,
     storage_quota_bytes, max_file_size_bytes, automations_per_month, ai_credits_per_month,
     has_time_tracking, has_github_integration, has_canvas_view, has_gantt_view,
     has_workload_view, has_sso, has_white_label, has_custom_domain,
     has_api_access, api_access_level, trial_days)
VALUES
    ('free',       2,    3,    200,   2,    1,   524288000,    26214400,    50,    100, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, NULL,          0),
    ('basic',     10, NULL,   5000,   5,    3, 21474836480,  262144000,   250,    500, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,  TRUE, 'read_only',   0),
    ('standard', NULL, NULL,  NULL,  10, NULL, 53687091200, 1073741824,  2500,   2000,  TRUE, FALSE, FALSE,  TRUE,  TRUE, FALSE, FALSE, FALSE,  TRUE, 'full',       14),
    ('pro',      NULL, NULL,  NULL,  25, NULL,214748364800, 5368709120, 25000,  10000,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE, FALSE,  TRUE,  TRUE,  TRUE, 'full',       14),
    ('enterprise',NULL, NULL, NULL, NULL, NULL,        NULL,       NULL,  NULL,   NULL,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE, 'full',        0);


-- ═══════════════════════════════════════════════
-- WORKSPACE ADD-ONS (NEW v1.1)
-- Active paid add-ons per workspace.
-- Referenced by: PRICING_AND_BILLING.md §3 (Add-Ons list),
--                §4 checkout.session.completed webhook.
-- NOT RLS protected — billing infrastructure (Super Admin full access).
-- ═══════════════════════════════════════════════
CREATE TABLE workspace_addons (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    addon_type          VARCHAR(100) NOT NULL,
    addon_sku           VARCHAR(100) NOT NULL,
    quantity            INT NOT NULL DEFAULT 1,
    unit_value          BIGINT NOT NULL,
    price_cents         INT NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
    stripe_item_id      VARCHAR(255),
    payfast_token       VARCHAR(255),
    active              BOOLEAN DEFAULT TRUE,
    activated_at        TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at        TIMESTAMPTZ,
    next_billing_date   DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspace_addons_workspace ON workspace_addons(workspace_id)
    WHERE active = TRUE;
```

---

## 8. Realtime Tables

```sql
-- ═══════════════════════════════════════════════
-- REALTIME EVENTS (NEW v1.1 — durable event log)
-- Append-only. Every model observer writes here AND publishes to Redis pub/sub.
-- Redis is ephemeral delivery; this table is the durable catch-up source.
-- Referenced by: REALTIME.md §2 (ItemObserver), §4 (Missed Event Recovery —
--                Node.js queries: SELECT ... WHERE room=$1 AND sequence>$2).
-- Partitioned monthly. Rows older than 7 days are safe to drop (pg_cron).
-- NOT RLS protected — Node.js service reads with superadmin role.
-- ═══════════════════════════════════════════════
CREATE TABLE realtime_events (
    id              UUID DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL,
    room            VARCHAR(255) NOT NULL,
    type            VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    actor_id        UUID,
    sequence        BIGINT NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE realtime_events_y2026m05 PARTITION OF realtime_events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE realtime_events_y2026m06 PARTITION OF realtime_events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE realtime_events_y2026m07 PARTITION OF realtime_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE realtime_events_y2026m08 PARTITION OF realtime_events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE realtime_events_y2026m09 PARTITION OF realtime_events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE realtime_events_y2026m10 PARTITION OF realtime_events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE realtime_events_y2026m11 PARTITION OF realtime_events
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE realtime_events_y2026m12 PARTITION OF realtime_events
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Core query index: SELECT * FROM realtime_events WHERE room=$1 AND sequence>$2 ORDER BY sequence
CREATE INDEX idx_realtime_events_room_seq ON realtime_events(room, sequence);
CREATE INDEX idx_realtime_events_occurred ON realtime_events(occurred_at);

-- Monotonic sequence per room (called by Laravel observers)
CREATE SEQUENCE realtime_event_seq START 1 CACHE 100;
```

---

## 9. ClickHouse Analytics Tables (separate DB)

```sql
-- ClickHouse schema (append-only, columnar)
CREATE TABLE events (
    workspace_id    UUID,
    user_id         UUID,
    event_name      String,
    entity_type     String,
    entity_id       UUID,
    properties      String,
    session_id      UUID,
    ip_address      String,
    user_agent      String,
    occurred_at     DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (workspace_id, occurred_at, event_name);
```

---

*Owner: Lead Architect + DBA*
*Version history: 1.0 initial | 1.1 gap-fill (13 missing tables/columns added — see changelog)*
*Cross-reference: ARCHITECTURE.md §4, SECURITY.md, REALTIME.md §2+§4,*
*PRICING_AND_BILLING.md §1+§3, AI_STRATEGY.md §3.4, FEATURES.md §1.3+§1.5*

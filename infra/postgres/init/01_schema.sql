-- 01_schema.sql
-- Full FlowOS / Aquerii production schema
-- All tenant tables have RLS enabled.
-- The app MUST run: SET app.workspace_id = '{uuid}' on every connection before querying.

-- ════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- trigram indexes for LIKE search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- GIN on btree types

-- ════════════════════════════════════════════════════════════════
-- WORKSPACES
-- ════════════════════════════════════════════════════════════════
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
    seat_quota              INT DEFAULT 5,
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

CREATE INDEX idx_workspaces_slug            ON workspaces(slug);
CREATE INDEX idx_workspaces_plan            ON workspaces(plan);
CREATE INDEX idx_workspaces_custom_domain   ON workspaces(custom_domain) WHERE custom_domain IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at   TIMESTAMPTZ,
    password_hash       VARCHAR(255),
    avatar_url          TEXT,
    locale              VARCHAR(20) DEFAULT 'en',
    timezone            VARCHAR(100) DEFAULT 'UTC',
    two_factor_secret   VARCHAR(255),
    two_factor_enabled  BOOLEAN DEFAULT FALSE,
    two_factor_recovery_codes TEXT,
    last_seen_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_users_email    ON users(email);

-- ════════════════════════════════════════════════════════════════
-- OAUTH ACCOUNTS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE oauth_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,
    provider_id     VARCHAR(255) NOT NULL,
    access_token    TEXT,
    refresh_token   TEXT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (provider, provider_id)
);

CREATE INDEX idx_oauth_user ON oauth_accounts(user_id);

-- ════════════════════════════════════════════════════════════════
-- WORKSPACE MEMBERS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE workspace_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(50) DEFAULT 'member',
    status          VARCHAR(50) DEFAULT 'active',
    invited_by      UUID REFERENCES users(id),
    invite_token    VARCHAR(255),
    joined_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user      ON workspace_members(user_id);

-- ════════════════════════════════════════════════════════════════
-- BOARDS
-- ════════════════════════════════════════════════════════════════
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
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE INDEX idx_boards_workspace ON boards(workspace_id) WHERE deleted_at IS NULL;

-- ════════════════════════════════════════════════════════════════
-- BOARD COLUMNS
-- ════════════════════════════════════════════════════════════════
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
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

-- ════════════════════════════════════════════════════════════════
-- BOARD GROUPS (sections)
-- ════════════════════════════════════════════════════════════════
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
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

-- ════════════════════════════════════════════════════════════════
-- ITEMS
-- ════════════════════════════════════════════════════════════════
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
    version         BIGINT NOT NULL DEFAULT 1,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON items
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE INDEX idx_items_board          ON items(board_id)       WHERE deleted_at IS NULL;
CREATE INDEX idx_items_group          ON items(group_id)       WHERE deleted_at IS NULL;
CREATE INDEX idx_items_parent         ON items(parent_id)      WHERE parent_id IS NOT NULL;
CREATE INDEX idx_items_workspace      ON items(workspace_id);
CREATE INDEX idx_items_due_date       ON items(due_date)       WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_items_column_values  ON items USING GIN(column_values);

-- ════════════════════════════════════════════════════════════════
-- ITEM ASSIGNEES
-- ════════════════════════════════════════════════════════════════
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
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

-- ════════════════════════════════════════════════════════════════
-- ITEM DEPENDENCIES
-- ════════════════════════════════════════════════════════════════
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
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

-- ════════════════════════════════════════════════════════════════
-- COMMENTS
-- ════════════════════════════════════════════════════════════════
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
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id) WHERE deleted_at IS NULL;

-- ════════════════════════════════════════════════════════════════
-- ACTIVITY LOG
-- ════════════════════════════════════════════════════════════════
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
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE INDEX idx_activity_entity            ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_workspace_created ON activity_log(workspace_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════
-- FILES
-- ════════════════════════════════════════════════════════════════
CREATE TABLE files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    entity_type     VARCHAR(50),
    entity_id       UUID,
    name            VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(255) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    storage_path    TEXT NOT NULL,
    thumbnail_url   TEXT,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON files
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

-- ════════════════════════════════════════════════════════════════
-- DOCUMENTS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE document_folders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    parent_id       UUID REFERENCES document_folders(id),
    name            VARCHAR(255) NOT NULL,
    icon            VARCHAR(50),
    position        FLOAT NOT NULL DEFAULT 0,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_folders
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    folder_id       UUID REFERENCES document_folders(id) ON DELETE SET NULL,
    linked_item_id  UUID REFERENCES items(id) ON DELETE SET NULL,
    title           VARCHAR(500) NOT NULL DEFAULT 'Untitled',
    icon            VARCHAR(50),
    content         JSONB,
    ydoc_state      BYTEA,
    word_count      INT DEFAULT 0,
    is_public       BOOLEAN DEFAULT FALSE,
    position        FLOAT NOT NULL DEFAULT 0,
    created_by      UUID NOT NULL REFERENCES users(id),
    updated_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE INDEX idx_documents_workspace ON documents(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_folder    ON documents(folder_id)    WHERE deleted_at IS NULL;

-- ════════════════════════════════════════════════════════════════
-- CRM — CONTACTS, COMPANIES, DEALS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE crm_contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    company_id      UUID,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    avatar_url      TEXT,
    job_title       VARCHAR(255),
    city            VARCHAR(100),
    country         VARCHAR(100),
    owner_id        UUID REFERENCES users(id),
    custom_fields   JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_contacts
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE TABLE crm_companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255),
    logo_url        TEXT,
    industry        VARCHAR(100),
    size            VARCHAR(50),
    country         VARCHAR(100),
    owner_id        UUID REFERENCES users(id),
    custom_fields   JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_companies
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

ALTER TABLE crm_contacts ADD CONSTRAINT fk_contact_company
    FOREIGN KEY (company_id) REFERENCES crm_companies(id) ON DELETE SET NULL;

CREATE TABLE crm_pipelines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    name            VARCHAR(255) NOT NULL DEFAULT 'Sales Pipeline',
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_pipelines
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE TABLE crm_pipeline_stages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    pipeline_id     UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    color           VARCHAR(20),
    position        FLOAT NOT NULL DEFAULT 0,
    probability     NUMERIC(5,2) DEFAULT 0,
    is_won          BOOLEAN DEFAULT FALSE,
    is_lost         BOOLEAN DEFAULT FALSE
);

ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_pipeline_stages
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE TABLE crm_deals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id),
    pipeline_id         UUID NOT NULL REFERENCES crm_pipelines(id),
    stage_id            UUID NOT NULL REFERENCES crm_pipeline_stages(id),
    contact_id          UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    company_id          UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
    title               VARCHAR(255) NOT NULL,
    value               NUMERIC(15,2),
    currency            VARCHAR(10) DEFAULT 'USD',
    owner_id            UUID REFERENCES users(id),
    expected_close_date DATE,
    ai_score            INT,
    ai_score_reasoning  JSONB,
    probability         NUMERIC(5,2),
    lost_reason         TEXT,
    custom_fields       JSONB DEFAULT '{}',
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_deals
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE INDEX idx_crm_deals_workspace ON crm_deals(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_deals_pipeline  ON crm_deals(pipeline_id, stage_id) WHERE deleted_at IS NULL;

-- ════════════════════════════════════════════════════════════════
-- AUTOMATIONS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE automations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    board_id        UUID REFERENCES boards(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    trigger         JSONB NOT NULL,
    filters         JSONB DEFAULT '[]',
    actions         JSONB NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    run_count       INT DEFAULT 0,
    last_run_at     TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON automations
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE TABLE automation_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    automation_id   UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    item_id         UUID REFERENCES items(id) ON DELETE SET NULL,
    status          VARCHAR(50) DEFAULT 'pending',
    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON automation_runs
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE INDEX idx_automation_runs_automation ON automation_runs(automation_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(100) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    body            TEXT,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notifications
    USING (workspace_id = current_setting('app.workspace_id', TRUE)::uuid);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ════════════════════════════════════════════════════════════════
-- REALTIME EVENTS (durable event log for missed-event catch-up)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE realtime_events (
    id              BIGSERIAL PRIMARY KEY,
    event_id        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL,
    room            VARCHAR(255) NOT NULL,
    type            VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    actor_id        UUID,
    sequence        BIGINT NOT NULL,
    occurred_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_realtime_events_room_seq ON realtime_events(room, sequence);
CREATE INDEX idx_realtime_events_occurred ON realtime_events(occurred_at);

-- Auto-prune events older than 7 days (keep table small)
-- Runs via pg_cron or a Horizon job

-- ════════════════════════════════════════════════════════════════
-- BILLING EVENTS (idempotent webhook log)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE billing_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID REFERENCES workspaces(id),
    processor       VARCHAR(20) NOT NULL,
    processor_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    processed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_events_workspace ON billing_events(workspace_id);

-- ════════════════════════════════════════════════════════════════
-- IDEMPOTENCY KEYS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE idempotency_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key             VARCHAR(255) NOT NULL,
    payload_hash    VARCHAR(64) NOT NULL,
    response        JSONB NOT NULL,
    status_code     SMALLINT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    UNIQUE (user_id, key)
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- ════════════════════════════════════════════════════════════════
-- SUPER ADMIN SCHEMA (separate — bypasses RLS entirely)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE superadmin.super_admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password        TEXT NOT NULL,
    totp_secret     TEXT,
    totp_enabled    BOOLEAN DEFAULT FALSE,
    role            TEXT NOT NULL DEFAULT 'support' CHECK (role IN ('owner','support','finance','devops')),
    last_login_at   TIMESTAMPTZ,
    last_login_ip   INET,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE superadmin.super_admin_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        UUID REFERENCES superadmin.super_admins(id),
    action          TEXT NOT NULL,
    target_type     TEXT,
    target_id       TEXT,
    ip              INET,
    user_agent      TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable audit log
CREATE RULE audit_no_update AS ON UPDATE TO superadmin.super_admin_audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO superadmin.super_admin_audit_log DO INSTEAD NOTHING;

CREATE TABLE superadmin.feature_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag            TEXT UNIQUE NOT NULL,
    enabled         BOOLEAN DEFAULT TRUE,
    plan_gate       TEXT[],
    workspace_overrides JSONB DEFAULT '{}',
    updated_by      UUID REFERENCES superadmin.super_admins(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- SEED DEFAULT FEATURE FLAGS
-- ════════════════════════════════════════════════════════════════
INSERT INTO superadmin.feature_flags (flag, enabled, plan_gate) VALUES
    ('ai_task_assistant',   TRUE,  NULL),
    ('ai_document',         TRUE,  NULL),
    ('ai_crm',              TRUE,  ARRAY['pro','enterprise']),
    ('canvas_view',         TRUE,  NULL),
    ('github_integration',  TRUE,  ARRAY['pro','enterprise']),
    ('white_label',         TRUE,  ARRAY['enterprise']),
    ('rag_knowledge_base',  TRUE,  ARRAY['pro','enterprise']),
    ('time_tracking',       TRUE,  ARRAY['standard','pro','enterprise']),
    ('guest_access',        TRUE,  NULL),
    ('maintenance_mode',    FALSE, NULL);

GRANT SELECT ON superadmin.feature_flags TO aquerii_app;

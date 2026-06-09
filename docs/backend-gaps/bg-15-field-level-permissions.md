# BG-15: Field-Level Permissions & SCIM Provisioning

**Status:** NOT IMPLEMENTED | **Priority:** P1 | **Complexity:** VERY HIGH

---

## 1. What the Feature Is

Two distinct but related enterprise features:

**Field-Level Permissions:** A granular permission system that controls read/write access to individual fields within an entity. Beyond the current workspace-level RBAC, this allows admins to say: "Managers can see salary fields, but members cannot" or "Only owners can edit the 'Confidential' field on tasks." Supports role-based and user-based rules, inheritance, and "effective permissions" preview.

**SCIM Provisioning:** SCIM 2.0 (System for Cross-domain Identity Management) endpoints for automated user provisioning from enterprise identity providers (Azure AD, Okta, Google Workspace, OneLogin). `/Users` and `/Groups` endpoints allow IdPs to create, update, and deprovision users and groups automatically.

## 2. Why It's Missing

### Field-Level Permissions

| Reason | Detail |
|--------|--------|
| **RBAC is workspace-level only** | Current roles (owner/admin/manager/member/viewer) are set per workspace and inherited by all entities. There's no concept of "this role = this permission ON this entity." The entire authorization model is a single switch per workspace. |
| **No entity-level permission table** | To support field-level permissions, we need a permission_rules table referencing entity_type + entity_id + field + role/user. This is a new database schema with zero existing migration path. |
| **Performance at scale** | Field-level permission checks mean: for every API response, compute the effective permissions for every field in every returned entity. For a board with 100 items x 20 fields = 2000 permission checks. This needs aggressive caching. |
| **UI complexity is severe** | The permission editor UI (showing entity tree + field list + role matrix) is harder than the backend. Every entity type has different fields. Dynamic forms, inheritance visualization, bulk operations — this hurts. |
| **Backward compatibility hell** | Existing API responses include ALL fields. Adding field-level filtering means every controller needs a `filter_fields_by_permission(entity, user)` call. Miss one endpoint and you have a data leak. |

### SCIM Provisioning

| Reason | Detail |
|--------|--------|
| **SCIM spec is massive** | SCIM 2.0 (RFC 7642-7644) is ~300 pages. `/Users`, `/Groups`, `/Schemas`, `/ServiceProviderConfig`, `/ResourceTypes`. PATCH requires RFC 6902 JSON Patch. Filtering requires a subset of LDAP filter syntax. Getting spec compliance wrong breaks enterprise IdP integrations. |
| **No IdP to test against** | To build SCIM, you need an actual IdP (Azure AD, Okta) to test the integration. We have none set up. Mocking an IdP is possible but misses real-world edge cases (attribute mapping conflicts, sync timing, deprovisioning behavior). |
| **User lifecycle complexity** | What happens when Azure AD deletes a user? Disable them? Remove from groups? Archive their tasks? Reassign their items? There's no deprovisioning policy system. |
| **No external identity support** | Users are created locally. There's no `external_id`, `idp_user_id`, or `idp_metadata` on the users table. OAuth/SSO exists but user records have no IdP linkage. |
| **Attribute mapping** | SCIM attributes (urn:ietf:params:scim:schemas:core:2.0:User) need to map to our user model. `name.givenName` → `user.first_name`, `emails[0].value` → `user.email`. The mapping system doesn't exist. |

**Hard truth:** Field-level permissions is a 6-week project that touches every controller, every model, and every API response. SCIM is another 4 weeks that requires enterprise IdP access for testing. Together they're the most complex single feature in the roadmap. The saving grace is that they're largely independent — you can build permissions without SCIM and vice versa.

## 3. Full Backend Spec

### 3.1 Data Models

```sql
-- ── Field-Level Permissions ──────────────────────────────────

-- Core permission rule. Grants/denies access to a field on an entity.
CREATE TABLE permission_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id),
    entity_type         VARCHAR(50) NOT NULL,  -- 'item', 'user', 'list', 'comment', 'workspace'
    entity_id           UUID,                  -- NULL = applies to ALL entities of this type
    field               VARCHAR(100) NOT NULL, -- 'title', 'description', 'assignee_id', 'due_date', '*' (all fields)
    principal_type      VARCHAR(10) NOT NULL,  -- 'role', 'user', 'group'
    principal_id        UUID NOT NULL,         -- role_id, user_id, or group_id
    permission          VARCHAR(10) NOT NULL,  -- 'read', 'write', 'none', 'inherit'
    priority            INTEGER NOT NULL DEFAULT 0,  -- higher = overrides lower in conflicts
    conditions          JSONB,                 -- optional: { "status": ["done"], "field_value": {"gt": 100} }
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, entity_type, entity_id, field, principal_type, principal_id)
);

CREATE INDEX idx_perm_rules_lookup ON permission_rules(workspace_id, entity_type, entity_id, field);
CREATE INDEX idx_perm_rules_principal ON permission_rules(principal_type, principal_id);

-- Permission inheritance chain
CREATE TABLE permission_inheritance (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id),
    parent_entity_type  VARCHAR(50) NOT NULL,
    parent_entity_id    UUID NOT NULL,
    child_entity_type   VARCHAR(50) NOT NULL,
    child_entity_id     UUID NOT NULL,
    inherit_rules       BOOLEAN NOT NULL DEFAULT TRUE,
    priority            INTEGER NOT NULL DEFAULT 0,
    UNIQUE(workspace_id, parent_entity_type, parent_entity_id, child_entity_type, child_entity_id)
);

-- Effective permissions materialized view (for fast queries)
CREATE MATERIALIZED VIEW effective_permissions AS
SELECT
    pr.workspace_id,
    pr.entity_type,
    COALESCE(pr.entity_id, '00000000-0000-0000-0000-000000000000') as entity_id,
    pr.field,
    pr.principal_type,
    pr.principal_id,
    pr.permission,
    pr.priority,
    pr.conditions
FROM permission_rules pr
WHERE pr.permission != 'inherit'
UNION ALL
-- Inherited rules (simplified — real logic joins inheritance chain)
SELECT * FROM inherited_permissions_function();

CREATE INDEX idx_effective_perms ON effective_permissions(workspace_id, entity_type, entity_id, principal_id);

-- Field definitions (for permission editor UI)
CREATE TABLE field_definitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type         VARCHAR(50) NOT NULL,  -- 'item', 'user', etc.
    field_name          VARCHAR(100) NOT NULL,
    display_name        VARCHAR(255) NOT NULL,
    field_type          VARCHAR(50) NOT NULL,  -- 'string', 'number', 'date', 'select', 'user', 'multi_user'
    allowed_roles       VARCHAR(50)[],         -- which roles can see this field exists
    sensitive           BOOLEAN NOT NULL DEFAULT FALSE,  -- flag for PII/financial data
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_type, field_name)
);

-- ── SCIM Provisioning ───────────────────────────────────────

-- SCIM configuration per workspace
CREATE TABLE scim_configurations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL UNIQUE REFERENCES workspaces(id),
    enabled             BOOLEAN NOT NULL DEFAULT FALSE,
    bearer_token        VARCHAR(255) NOT NULL,       -- generated, used for IdP auth
    bearer_token_rotated_at TIMESTAMPTZ,
    default_role        VARCHAR(20) NOT NULL DEFAULT 'member',
    auto_deprovision    BOOLEAN NOT NULL DEFAULT FALSE,  -- delete users removed from IdP
    deprovision_action  VARCHAR(20) NOT NULL DEFAULT 'disable',  -- 'disable', 'archive', 'delete'
    attribute_mapping   JSONB DEFAULT '{}',          -- IdP attribute → NexusFlow field mapping
    external_idp        VARCHAR(50),                 -- 'azure_ad', 'okta', 'google', 'onelogin'
    provision_on_login  BOOLEAN NOT NULL DEFAULT TRUE,  -- auto-create user on first SSO login
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SCIM provisioning log
CREATE TABLE scim_provisioning_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id),
    scim_endpoint       VARCHAR(50) NOT NULL,       -- '/Users', '/Groups'
    http_method         VARCHAR(10) NOT NULL,
    request_body        JSONB,
    response_status     INTEGER,
    response_body       JSONB,
    idp_trace_id        VARCHAR(255),               -- IdP request ID for debugging
    success             BOOLEAN NOT NULL,
    error_message       TEXT,
    duration_ms         INTEGER NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scim_log_workspace ON scim_provisioning_log(workspace_id, created_at DESC);

-- SCIM synced users (tracks IdP linkage)
ALTER TABLE users ADD COLUMN IF NOT EXISTS
    scim_external_id    VARCHAR(255) UNIQUE,         -- IdP user ID (sub/username)
    scim_metadata       JSONB,                       -- raw SCIM user attributes
    idp_name            VARCHAR(50),                 -- which IdP provisioned this user
    provisioned_at      TIMESTAMPTZ,
    deprovisioned_at    TIMESTAMPTZ;

-- SCIM groups (synced from IdP)
CREATE TABLE scim_groups (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id),
    external_id         VARCHAR(255) NOT NULL,       -- IdP group ID
    display_name        VARCHAR(255) NOT NULL,
    scim_metadata       JSONB,
    last_synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, external_id)
);

-- SCIM group membership
CREATE TABLE scim_group_members (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id            UUID NOT NULL REFERENCES scim_groups(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);
```

### 3.2 Permission Evaluation Engine

```sql
-- Core function: get effective permission for a user on a field
CREATE OR REPLACE FUNCTION get_effective_permission(
    p_workspace_id UUID,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_field VARCHAR,
    p_user_id UUID
) RETURNS TABLE (
    permission VARCHAR,
    source_rule_id UUID,
    confidence VARCHAR  -- 'exact', 'inherited', 'default'
) LANGUAGE plpgsql AS $$
BEGIN
    -- 1. Check exact entity + field rules (highest priority)
    RETURN QUERY
    SELECT pr.permission, pr.id, 'exact'
    FROM permission_rules pr
    WHERE pr.workspace_id = p_workspace_id
      AND pr.entity_type = p_entity_type
      AND pr.entity_id = p_entity_id
      AND (pr.field = p_field OR pr.field = '*')
      AND (
          (pr.principal_type = 'user' AND pr.principal_id = p_user_id)
          OR (pr.principal_type = 'role' AND pr.principal_id IN (
              SELECT role_id FROM workspace_members
              WHERE user_id = p_user_id AND workspace_id = p_workspace_id
          ))
      )
      AND pr.permission != 'inherit'
    ORDER BY pr.priority DESC, pr.field DESC  -- specific field > wildcard
    LIMIT 1;

    -- 2. Check entity-level rules (all fields)
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT pr.permission, pr.id, 'entity_level'
        FROM permission_rules pr
        WHERE pr.workspace_id = p_workspace_id
          AND pr.entity_type = p_entity_type
          AND pr.entity_id = p_entity_id
          AND pr.field = '*'
          AND (
              (pr.principal_type = 'user' AND pr.principal_id = p_user_id)
              OR (pr.principal_type = 'role' AND pr.principal_id IN (
                  SELECT role_id FROM workspace_members
                  WHERE user_id = p_user_id AND workspace_id = p_workspace_id
              ))
          )
          AND pr.permission != 'inherit'
        ORDER BY pr.priority DESC
        LIMIT 1;
    END IF;

    -- 3. Check inherited rules from parent entities
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT pr.permission, pr.id, 'inherited'
        FROM permission_inheritance pi
        JOIN permission_rules pr ON pr.entity_type = pi.parent_entity_type
            AND pr.entity_id = pi.parent_entity_id
            AND (pr.field = p_field OR pr.field = '*')
        WHERE pi.child_entity_type = p_entity_type
          AND pi.child_entity_id = p_entity_id
          AND pi.workspace_id = p_workspace_id
          AND pi.inherit_rules = TRUE
          AND (
              (pr.principal_type = 'user' AND pr.principal_id = p_user_id)
              OR (pr.principal_type = 'role' AND pr.principal_id IN (
                  SELECT role_id FROM workspace_members
                  WHERE user_id = p_user_id AND workspace_id = p_workspace_id
              ))
          )
          AND pr.permission != 'inherit'
        ORDER BY pr.priority DESC
        LIMIT 1;
    END IF;

    -- 4. Default: workspace role determines access
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            CASE
                WHEN wm.role IN ('owner', 'admin') THEN 'write'
                WHEN wm.role = 'manager' THEN 'write'
                WHEN wm.role = 'member' THEN 'read'
                ELSE 'none'
            END,
            NULL::UUID,
            'default'
        FROM workspace_members wm
        WHERE wm.workspace_id = p_workspace_id AND wm.user_id = p_user_id;
    END IF;
END;
$$;
```

### 3.3 API Endpoints

```yaml
# ── Field-Level Permissions ───────────────────────────────────

GET /api/permissions/entity/{entityType}/{entityId}
  Response: {
    rules: PermissionRule[],
    inheritance_chain: [{ entity_type, entity_id }],
    effective: {
      for_current_user: { field: 'read', field2: 'write', ... },
      summary: { total_rules: number, inherited: number, custom: number }
    }
  }
  Notes: Returns all rules for a specific entity. Includes effective view for current user.

POST /api/permissions/entity/{entityType}/{entityId}
  Body: {
    rules: [{
      field: string,
      principal_type: 'role'|'user',
      principal_id: UUID,
      permission: 'read'|'write'|'none'|'inherit',
      priority?: number,
      conditions?: {}
    }]
  }
  Response: { data: PermissionRule[] }
  Notes: Batch create rules for an entity. Replaces existing with matching (field, principal).
  Errors: 400 if entity doesn't exist, 403 if not admin/owner

PUT /api/permissions/rules/{ruleId}
  Body: { permission?: string, priority?: number, conditions?: {} }
  Response: { data: PermissionRule }

DELETE /api/permissions/rules/{ruleId}
  Response: { success: true }

GET /api/permissions/effective/{entityType}/{entityId}/{userId}
  Response: {
    user_id: UUID,
    user_role: string,
    effective_permissions: {
      title: 'write',
      description: 'write',
      assignee_id: 'read',
      due_date: 'read',
      priority: 'read',
      confidential_note: 'none'
    },
    source_rules: {
      title: { rule_id, source: 'exact' },
      confidential_note: { source: 'workspace_default' }
    }
  }
  Notes: Preview tool for admins to see what a user can access.

GET /api/permissions/entity/{entityType}/fields
  Response: {
    entity_type: string,
    fields: [{ name, display_name, field_type, sensitive }]
  }
  Notes: Returns all fieldable fields for an entity type. Used by the permission editor UI.

POST /api/permissions/inheritance
  Body: {
    workspace_id: UUID,
    parent_entity_type: string,
    parent_entity_id: UUID,
    child_entity_type: string,
    child_entity_id: UUID,
    inherit_rules: boolean
  }
  Response: { data: PermissionInheritance }

DELETE /api/permissions/inheritance/{id}
  Response: { success: true }

# ── SCIM 2.0 ──────────────────────────────────────────────────

# SCIM Service Provider Configuration
GET /api/scim/v2/ServiceProviderConfig
  Headers: Authorization: Bearer <token>
  Response: SCIM ServiceProviderConfig JSON (RFC 7644)
  Notes: No auth check (required by spec). Returns supported features.

# SCIM Schema
GET /api/scim/v2/Schemas
GET /api/scim/v2/Schemas/{urn}
  Response: SCIM Schema JSON

# SCIM Resource Types
GET /api/scim/v2/ResourceTypes
  Response: [{ name: "User", endpoint: "/Users", schema: "urn:..." }, { name: "Group", ... }]

# SCIM Users
GET /api/scim/v2/Users
  Query: ?filter=userName eq "alice"&attributes=userName,emails&startIndex=1&count=50
  Response: { Resources: SCIMUser[], totalResults: number, itemsPerPage: number, startIndex: number }
  Logic:
    1. Authenticate via Bearer token
    2. Parse SCIM filter (subset of RFC 7644 filter syntax)
    3. Map SCIM attributes → user model via attribute_mapping
    4. Return paginated results
  Supported filters: eq, ne, co, sw, pr, gt, ge, lt, le, and, or, not

POST /api/scim/v2/Users
  Headers: Content-Type: application/scim+json
  Body: SCIM User JSON (schemas, userName, name, emails, active, externalId)
  Response: 201 Created, SCIM User JSON
  Logic:
    1. Validate against SCIM User schema
    2. Map attributes via attribute_mapping
    3. Check for existing user by externalId or userName
    4. Create user if new, update if exists
    5. Assign default_role in workspace
    6. Return SCIM JSON response

GET /api/scim/v2/Users/{scimExternalId}
  Response: SCIM User JSON or 404

PUT /api/scim/v2/Users/{scimExternalId}
  Body: Full SCIM User JSON
  Logic: Full replacement of user attributes

PATCH /api/scim/v2/Users/{scimExternalId}
  Body: SCIM PATCH operation (RFC 6902 JSON Patch or SCIM PATCH)
  Logic: Partial update of user attributes

DELETE /api/scim/v2/Users/{scimExternalId}
  Response: 204 No Content
  Logic: Deprovision user based on scim_config.deprovision_action

# SCIM Groups
GET /api/scim/v2/Groups
  Query: ?filter=displayName eq "Engineering"&startIndex=1&count=50
  Response: { Resources: SCIMGroup[], totalResults, ... }

POST /api/scim/v2/Groups
  Body: SCIM Group JSON (schemas, displayName, members: [{value, type}])
  Response: 201 Created

GET /api/scim/v2/Groups/{externalId}
  Response: SCIM Group JSON

PUT /api/scim/v2/Groups/{externalId}
  Body: Full SCIM Group JSON

PATCH /api/scim/v2/Groups/{externalId}
  Body: SCIM PATCH operation

DELETE /api/scim/v2/Groups/{externalId}
  Response: 204 No Content

# ── SCIM Admin (Workspace Settings) ──────────────────────────

GET /api/workspaces/{workspaceId}/scim/config
  Response: { data: ScimConfiguration }  (bearer_token masked: "tok_***abc")

PUT /api/workspaces/{workspaceId}/scim/config
  Body: {
    enabled?: boolean,
    default_role?: string,
    auto_deprovision?: boolean,
    deprovision_action?: string,
    attribute_mapping?: {},
    provision_on_login?: boolean
  }
  Response: { data: ScimConfiguration }
  Notes: Updating enabled=true generates a new bearer token if one doesn't exist.

POST /api/workspaces/{workspaceId}/scim/rotate-token
  Response: { bearer_token: string (full) }
  Notes: Rotates the bearer token. Old token invalidated immediately. Admin only.

POST /api/workspaces/{workspaceId}/scim/sync
  Response: { sync_id: UUID, status: 'started' }
  Notes: Manually trigger a sync. Runs in background.

GET /api/workspaces/{workspaceId}/scim/syncs
  Query: ?limit=10&offset=0
  Response: { data: ScimProvisioningLog[] }
  Notes: Sync history for audit.

GET /api/workspaces/{workspaceId}/scim/syncs/{id}
  Response: { data: ScimProvisioningLog (full detail including request/response bodies) }
```

### 3.4 SCIM Attribute Mapping (Default)

```json
{
  "userName": "email",
  "name.givenName": "first_name",
  "name.familyName": "last_name",
  "name.formatted": "name",
  "emails[type eq \"work\"].value": "email",
  "phoneNumbers[type eq \"work\"].value": "phone",
  "active": "is_active",
  "externalId": "scim_external_id",
  "title": "job_title",
  "locale": "locale",
  "timezone": "timezone"
}
```

Workspace admins can override this mapping. The mapping supports:
- Simple: `"scimAttr": "localField"`
- Nested: `"name.givenName": "first_name"`
- Array filter: `"emails[type eq \"work\"].value": "email"`
- Constant: `"locale": { "constant": "en-US" }`
- Transform: `"name.formatted": { "concat": ["name.givenName", " ", "name.familyName"] }`

### 3.5 Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `SCIMSyncJob` | On-demand (triggered by IdP or manual) | Pulls Users/Groups from IdP, diffs with local, applies changes |
| `DeprovisionCleanupJob` | Daily | Handles cleanup for deprovisioned users (reassign tasks, archive) |
| `PermissionCacheWarmJob` | Hourly | Warms effective_permissions materialized view for frequently accessed entities |
| `PermissionAuditJob` | Daily | Logs permission changes for audit trail |

## 4. Frontend Design

### 4.1 Permission Editor (per entity)

```
┌─────────────────────────────────────────────────────────────┐
│ Field Permissions · Project Alpha (List)                     │
│                                                               │
│ Permission rules determine who can see or edit each field.    │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [Entity: Project Alpha ▼]  [Inherit from workspace □]    │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌───────────────┬──────────────┬──────────┬───────────────┐  │
│ │ Field         │ Role/User    │ Access   │ Conditions    │  │
│ ├───────────────┼──────────────┼──────────┼───────────────┤  │
│ │ Title         │ Manager      │ ✎ Write  │ —             │  │
│ │               │ Member       │ 👁 Read  │ —             │  │
│ │               │ Viewer       │ 👁 Read  │ —             │  │
│ ├───────────────┼──────────────┼──────────┼───────────────┤  │
│ │ Description   │ [Inherited]  │ ✎ Write  │ —             │  │
│ ├───────────────┼──────────────┼──────────┼───────────────┤  │
│ │ Priority      │ [Inherited]  │ ✎ Write  │ —             │  │
│ ├───────────────┼──────────────┼──────────┼───────────────┤  │
│ │ Assignee      │ [Inherited]  │ ✎ Write  │ —             │  │
│ ├───────────────┼──────────────┼──────────┼───────────────┤  │
│ │ Due Date      │ [Inherited]  │ ✎ Write  │ —             │  │
│ ├───────────────┼──────────────┼──────────┼───────────────┤  │
│ │ Estimated     │ Member       │ 🚫 None  │ —             │  │
│ │ Hours         │ Viewer       │ 🚫 None  │ —             │  │
│ │               │ Manager      │ ✎ Write  │ —             │  │
│ ├───────────────┼──────────────┼──────────┼───────────────┤  │
│ │ Confidential  │ Owner        │ ✎ Write  │ —             │  │
│ │ Note          │ Admin        │ 👁 Read  │ —             │  │
│ │               │ [all others] │ 🚫 None  │ —             │  │
│ │               │              │          │               │  │
│ │               │              │          │               │  │
│ └───────────────┴──────────────┴──────────┴───────────────┘ │
│                                                               │
│ [+ Add Rule]                                  [Save Changes]  │
│                                                               │
│ ── Inheritance ──                                              │
│ This list inherits rules from: Workspace > Project Alpha       │
│ [✓] Inherit rules from parent  [Apply to all children ▾]     │
│                                                               │
│ [Apply rules to all items in this list]                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Add/Edit Rule Dialog

```
┌──────────────────────────────────────┐
│ Add Permission Rule                    │
│                                         │
│ Field: [Priority ▼]                     │
│                                         │
│ Principal:                              │
│ ○ Role  [Manager ▼]                     │
│ ○ User  [Search users... ▼]             │
│ ○ Group [SCIM groups... ▼]              │
│                                         │
│ Access: [Write ▼]                       │
│  ○ Write (can view + edit)              │
│  ○ Read (can view only)                 │
│  ○ None (hidden)                        │
│  ○ Inherit (use parent rule)            │
│                                         │
│ Conditions (optional):                   │
│ Apply rule only when:                    │
│   Status equals [Done ▼]                 │
│ [+ Add condition]                        │
│                                         │
│ Priority: [0] (higher = wins)           │
│                                         │
│  [Cancel]  [Add Rule]                   │
└──────────────────────────────────────┘
```

### 4.3 Effective Permissions Preview

```
┌─────────────────────────────────────────────────────────────┐
│ Effective Permissions Preview                                 │
│                                                               │
│ View as: [Bob Smith (Member) ▼]                               │
│                                                               │
│ Entity: Project Alpha                                         │
│                                                               │
│ ┌───────────────┬──────────────┬────────────────────────────┐ │
│ │ Field         │ Access       │ Source                     │ │
│ ├───────────────┼──────────────┼────────────────────────────┤ │
│ │ Title         │ ✎ Write      │ Workspace default (Member) │ │
│ │ Description   │ ✎ Write      │ Workspace default (Member) │ │
│ │ Priority      │ ✎ Write      │ Workspace default (Member) │ │
│ │ Assignee      │ 👁 Read      │ Custom rule #42            │ │
│ │ Due Date      │ 👁 Read      │ Inherited from project     │ │
│ │ Estimated Hrs │ 🚫 None      │ Custom rule #44            │ │
│ │ Confidential  │ 🚫 None      │ Workspace default (Member) │ │
│ └───────────────┴──────────────┴────────────────────────────┘ │
│                                                               │
│ [Export as CSV]                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 SCIM Configuration Page

```
┌─────────────────────────────────────────────────────────────┐
│ SCIM Provisioning                                            │
│                                                               │
│ Directory Sync                              [● Active]        │
│ ───────────────────────────────────────────                   │
│ Provision users and groups from your identity provider.       │
│                                                               │
│ ── Connection ──                                               │
│ SCIM Base URL: https://api.nexusflow.com/scim/v2              │
│ Bearer Token:  tok_••••••••••••••••••••••••wd3a               │
│ [Copy] [Rotate Token]                                         │
│                                                               │
│ ── Settings ──                                                 │
│ [✓] Enable SCIM provisioning                                  │
│ Default role for new users: [Member ▼]                        │
│ [✓] Auto-deprovision users removed from IdP                   │
│     Deprovision action: [Disable account ▼]                   │
│ [✓] Provision on first SSO login                              │
│                                                               │
│ ── Attribute Mapping ──                                       │
│ ┌──────────────────────────┬──────────────────────────────┐   │
│ │ SCIM Attribute           │ NexusFlow Field              │   │
│ ├──────────────────────────┼──────────────────────────────┤   │
│ │ userName                 │ email                        │   │
│ │ name.givenName           │ first_name                   │   │
│ │ name.familyName          │ last_name                    │   │
│ │ active                   │ is_active                    │   │
│ │ externalId               │ scim_external_id             │   │
│ └──────────────────────────┴──────────────────────────────┘   │
│ [Reset to Default]                                              │
│                                                               │
│ ── IdP Configuration Guide ──                                  │
│ [How to configure Azure AD ▾]                                 │
│ [How to configure Okta ▾]                                     │
│ [How to configure Google Workspace ▾]                         │
│                                                               │
│  [Save Configuration]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 SCIM Sync History

```
┌─────────────────────────────────────────────────────────────┐
│ Provisioning Log                          [Last sync: 2m ago]│
│                                                    [Sync Now]│
│ ┌───────┬──────────┬────────┬────────┬────────┬───────────┐ │
│ │ Time  │ Endpoint │ Method │ Status │ Items  │ Duration  │ │
│ ├───────┼──────────┼────────┼────────┼────────┼───────────┤ │
│ │ 10:23 │ /Users   │ GET    │ 200 ✅ │ 45     │ 1.2s      │ │
│ │ 10:23 │ /Groups  │ GET    │ 200 ✅ │ 12     │ 0.8s      │ │
│ │ 09:15 │ /Users   │ POST   │ 201 ✅ │ 1      │ 0.3s      │ │
│ │ 08:00 │ /Users   │ PATCH  │ 200 ✅ │ 1      │ 0.2s      │ │
│ │ 07:30 │ /Groups  │ PATCH  │ 400 ❌ │ —      │ 0.1s      │ │
│ ├───────┼──────────┼────────┼────────┼────────┼───────────┤ │
│ │               Showing 5 of 1,204 entries    │ [View All] │ │
│ └───────┴──────────┴────────┴────────┴────────┴───────────┘ │
│                                                               │
│ Sync Status: ● Connected (last heartbeat: 30s ago)            │
│ Users provisioned: 45 · Groups synced: 12 · Errors: 1        │
└─────────────────────────────────────────────────────────────┘
```

### 4.6 States Enumeration

| State | Permissions | SCIM |
|-------|-------------|------|
| **Empty** | "No custom permission rules. All fields use workspace defaults." | "SCIM not configured. Follow the setup guide to connect your IdP." |
| **Loading** | Skeleton table with 5 shimmer rows | 3 skeleton cards |
| **Saving** | "Saving..." with disabled buttons | "Syncing..." with cancel option |
| **Error saving** | Toast: "Failed to save rule. Verify the field and principal exist." | HTTP 400 error detail shown inline |
| **Conflict** | "Two rules match the same field+principal. Higher priority wins." | "Duplicate externalId detected. Merging attributes." |
| **Preview mismatch** | "This user's effective permissions differ from what rules suggest." | N/A |
| **IdP disconnected** | N/A | "Connection to IdP lost. Check your SCIM endpoint and token." |

### 4.7 Error Handling

| Error | Permissions Frontend | SCIM Frontend |
|-------|---------------------|---------------|
| **403** | "You need admin access to modify permissions." | "Token invalid or expired. [Rotate token]" |
| **404 entity** | "Entity not found. It may have been deleted." | "External ID not found in workspace." |
| **Validation** | Inline: "Field 'confidential' does not exist on type 'item'." | "Invalid SCIM schema. Missing required attribute 'userName'." |
| **Rate limit** | "Too many changes. Wait and try again." | "IdP rate limited. Sync queued for retry in 5 minutes." |
| **Concurrent edit** | "Permissions were modified by another admin. [Reload]" | "Sync already in progress. Waiting..." |

---

**Implementation estimate:** 8-10 weeks (field-level permissions: 5-6 weeks, SCIM: 3-4 weeks)
**Dependencies:** Workspace RBAC (existing), User model extension (scim_external_id), Entity model audit trail
**Risk:** HIGH. Field-level permissions require auditing every API response for potential data leaks. A single missed `filter_fields_by_permission()` call exposes sensitive data. SCIM has no tolerance for spec non-compliance — enterprise IdPs will reject the integration. Recommend shipping permission engine first with aggressive testing, then SCIM.

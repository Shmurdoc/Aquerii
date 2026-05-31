# Data Model Enhancements for Multi-Tenant SaaS

## New Migrations

### 1. `create_plan_features_table`
```sql
CREATE TABLE plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key VARCHAR(50) NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    feature_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_key, feature_key)
);
```

### 2. `create_workspace_usage_table`
```sql
CREATE TABLE workspace_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    metric_key VARCHAR(100) NOT NULL,
    metric_value BIGINT NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, metric_key)
);
-- RLS enabled
```

### 3. `create_employee_groups_table` (if not exists)
```sql
CREATE TABLE employee_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS enabled
```

### 4. Enhance `crm_companies`
```sql
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free';
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS employee_count INT DEFAULT 0;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT false;
```

### 5. Enhance `workspace_members`
```sql
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS employee_group_id UUID REFERENCES employee_groups(id) ON DELETE SET NULL;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS is_company_owner BOOLEAN DEFAULT false;
```

### 6. `create_admin_audit_log_table`
```sql
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES super_admins(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    before JSONB,
    after JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- No RLS — this is the admin's audit trail
```

## Existing Models to Update

### Workspace
- Add `employee_groups()` HasMany relationship
- Add `usage()` HasMany relationship (workspace_usage)
- Add `plan_features()` helper to check limits

### CrmCompany
- Add `owner` BelongsTo relationship to User
- Add `subscription_plan` cast to SubscriptionPlan enum
- Add `employee_count` cached counter

### User
- Add `managedEmployeeGroups()` HasMany
- Add `subordinates()` HasMany (via workspace_members.reports_to)
- Add `ownedCompanies()` HasMany (via crm_companies.owner_id)

## Soft Delete Compliance

Ensure these entities support soft deletes for enterprise compliance:
- `workspace_members` — restore member
- `employee_groups` — restore group
- `plan_features` — never soft-deleted, always versioned
- `workspace_usage` — never soft-deleted, immutable
- `admin_audit_log` — never deleted, append-only

# SCHEMA EVOLUTION & MIGRATION STRATEGY

**Version**: 2.0  
**Status**: AUTHORITATIVE  
**Owner**: Team Beta + gstack data-migration.md specialist  

---

## 1. Core Principles

1. **Never break consumers**: Schema changes are additive-only within a major version
2. **Always reversible**: Every migration has an `up()` and `down()` method
3. **Tested before production**: All migrations run on staging with production data copy first
4. **Zero-downtime**: Use expand-contract pattern for breaking changes
5. **Idempotent migrations**: Running twice must produce same result
6. **Versioned event schemas**: Event payloads have explicit `schema_version` field
7. **Backward-compatible APIs**: API responses never remove fields (only add)

---

## 2. Database Migration Standards

### 2.1 Tool per Service

| Service | Migration Tool | Migration Directory |
|---------|----------------|---------------------|
| FastAPI Gateway | Alembic | `services/gateway/db/migrations/` |
| InvenTree | Django migrations | `InvenTree-master/src/backend/InvenTree/*/migrations/` |
| AureusERP | Laravel migrations | `aureuserp-master/database/migrations/` |
| Twenty CRM | TypeORM migrations | `twenty-main/packages/twenty-server/src/database/migrations/` |
| Paperless-ngx | Django migrations | Managed inside Docker image |
| YetiForceCRM | PHP custom migrations | `YetiForceCRM-developer/install/install_schema/` |

### 2.2 Migration Naming Convention

```
Format: {YYYYMMDD_HHMMSS}_{short_description}
Examples:
  20260504_100000_add_idempotency_key_to_events.py
  20260504_120000_add_part_lifecycle_state_index.py
  20260504_140000_create_dlq_table.php
```

### 2.3 Alembic Migration Template (Gateway)

```python
# services/gateway/db/migrations/versions/20260504_100000_add_idempotency_key.py
"""add idempotency key to events table

Revision ID: abc123def456
Revises: previous_revision_id
Create Date: 2026-05-04 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = 'abc123def456'
down_revision = 'previous_revision_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ADDITIVE: Add nullable column first
    op.add_column('events', sa.Column('idempotency_key', sa.String(255), nullable=True))
    
    # Create index CONCURRENTLY (no table lock)
    op.create_index(
        'ix_events_idempotency_key',
        'events',
        ['idempotency_key'],
        postgresql_concurrently=True
    )
    
    # Note: Make NOT NULL in a separate migration after backfill


def downgrade() -> None:
    op.drop_index('ix_events_idempotency_key', table_name='events')
    op.drop_column('events', 'idempotency_key')
```

### 2.4 Zero-Downtime Pattern (Expand-Contract)

When changing a column that has data:

```
Phase 1 - EXPAND (deploy v1.1):
  - Add NEW column (nullable)
  - Application writes to BOTH old and new column
  - Reads from OLD column

Phase 2 - MIGRATE (background job):
  - Backfill new column from old column for existing rows
  - Verify backfill complete

Phase 3 - SWITCH (deploy v1.2):
  - Application reads from NEW column
  - Application still writes to both

Phase 4 - CONTRACT (deploy v1.3):
  - Remove old column from writes
  - Drop old column in migration
  - Make new column NOT NULL
```

**Example**: Renaming `part_number` to `sku` in gateway:
```python
# Migration v1: Add sku column (nullable)
def upgrade_v1():
    op.add_column('parts', sa.Column('sku', sa.String(100), nullable=True))

# Migration v2: Backfill sku from part_number
def upgrade_v2():
    op.execute("UPDATE parts SET sku = part_number WHERE sku IS NULL")
    op.alter_column('parts', 'sku', nullable=False)

# Migration v3: Drop old column
def upgrade_v3():
    op.drop_column('parts', 'part_number')
```

---

## 3. API Schema Versioning

### 3.1 URL Versioning Strategy

```
/api/v1/inventory/parts    → Current stable version
/api/v2/inventory/parts    → New version in development

Policy:
  - v1 supported for minimum 6 months after v2 release
  - Deprecation notice in response headers: X-API-Deprecated: true
  - v1 sunset communicated 60 days in advance via Zulip #api-changes
```

### 3.2 Response Schema — Backward Compatibility Rules

```python
# These changes are ALLOWED (backward compatible):
# ✅ Add new optional field
# ✅ Add new endpoint
# ✅ Change description/documentation
# ✅ Add new enum value (consumers must handle unknown values gracefully)
# ✅ Make required field optional

# These changes REQUIRE a new API version:
# ❌ Remove a field
# ❌ Rename a field
# ❌ Change field type (string → int)
# ❌ Change endpoint path
# ❌ Make optional field required
# ❌ Change error codes
```

### 3.3 API Versioning in Gateway Code

```python
# services/gateway/routers/inventory.py

from fastapi import APIRouter

router_v1 = APIRouter(prefix="/api/v1/inventory", tags=["Inventory v1"])
router_v2 = APIRouter(prefix="/api/v2/inventory", tags=["Inventory v2"])

@router_v1.get("/parts")
async def list_parts_v1():
    """Original response format"""
    return {"parts": [...], "total": 100}

@router_v2.get("/parts")
async def list_parts_v2():
    """Enhanced response format with pagination meta"""
    return {
        "data": [...],
        "meta": {"total": 100, "page": 1, "per_page": 20},
        "errors": []
    }
```

---

## 4. Event Schema Versioning

### 4.1 Event Envelope with Version

```json
{
  "event_id": "uuid-v4",
  "event_type": "inventory.stock.low",
  "schema_version": "1.0",
  "source_service": "inventree",
  "timestamp_utc": "2026-05-04T10:00:00Z",
  "payload": {
    "part_id": 123,
    "part_name": "BOLT-M6",
    "current_qty": 5,
    "reorder_qty": 50
  }
}
```

### 4.2 Consumer-Side Schema Compatibility

All event consumers MUST handle unknown fields gracefully:

```python
# services/gateway/models/events.py
from pydantic import BaseModel, Extra

class StockLowEvent(BaseModel):
    part_id: int
    part_name: str
    current_qty: float
    reorder_qty: float
    # Future fields: suppliers, category, etc.
    
    class Config:
        extra = Extra.ignore  # ✅ Ignore unknown fields from newer schema versions
```

### 4.3 Schema Evolution Flow

```
Event producer wants to add "preferred_supplier_id" field to inventory.stock.low:

1. Update API_CONTRACTS.md with new field (schema_version: "1.1")
2. Consumer-driven contract test: verify all consumers handle unknown field gracefully
3. Update producer to include new field (still send schema_version: "1.0")
4. Deploy consumers first (they already ignore the new field)
5. Bump schema_version to "1.1" in producer
6. Deploy producer
7. Update consumers to use new field (optional enhancement)
```

---

## 5. Database Indexing Standards

```sql
-- Mandatory indexes for performance
-- (Apply during Phase 2 setup, not as afterthought)

-- Gateway: idempotency lookups (very hot path)
CREATE UNIQUE INDEX idx_events_idempotency_key 
ON gateway_events(idempotency_key);

-- Gateway: DLQ status queries
CREATE INDEX idx_dlq_status_created 
ON dead_letter_queue(status, created_at);

-- InvenTree: low stock queries (frequent)
CREATE INDEX idx_stockitem_part_quantity 
ON stock_stockitem(part_id, quantity) 
WHERE is_building = false;

-- Twenty: deal pipeline queries
CREATE INDEX idx_opportunity_stage 
ON core_opportunity(stage_id, assignee_id, updated_at);

-- AureusERP: invoice aging queries
CREATE INDEX idx_invoice_due_status 
ON invoices(due_date, status) 
WHERE status != 'paid';
```

---

## 6. Data Seed Strategy

### 6.1 Seed Categories

| Seed Type | File | Environment | Purpose |
|-----------|------|-------------|---------|
| Reference data | `seed_reference.py` | All | Countries, currencies, units |
| Demo parts | `seed_inventory.py` | Local + Staging | Sample InvenTree parts catalog |
| Demo customers | `seed_crm.py` | Local + Staging | Sample Twenty CRM contacts |
| Demo financials | `seed_erp.py` | Local + Staging | Sample AureusERP chart of accounts |
| User accounts | `seed_users.py` | All | Admin + role-based test users |

### 6.2 Seed Execution Order

```bash
# scripts/seed_data.sh
#!/bin/bash
echo "Seeding reference data..."
python scripts/seeds/seed_reference.py

echo "Seeding user accounts..."
python scripts/seeds/seed_users.py

echo "Seeding inventory catalog..."
python scripts/seeds/seed_inventory.py

echo "Seeding CRM data..."
python scripts/seeds/seed_crm.py

echo "Seeding ERP accounts..."
python scripts/seeds/seed_erp.py

echo "Seed complete. Verify at http://localhost:8003 (Homarr dashboard)"
```

---

## 7. Migration Runbook (Pre-Production Checklist)

```
BEFORE any migration in production:

□ 1. Backup database: pg_dump -Fc inventree_db > backup_$(date +%Y%m%d_%H%M%S).dump
□ 2. Test migration on staging: Verify up() and down() both work
□ 3. Measure migration time on staging data (must be < 5 min for non-zero-downtime)
□ 4. EXPLAIN ANALYZE all queries affected by new indexes
□ 5. Verify no Seq Scans on large tables
□ 6. Calculate downtime window: if migration > 30s, use zero-downtime pattern
□ 7. Communicate to team: post in Zulip #deployments with ETA and rollback plan
□ 8. Run migration: docker exec mine-gateway alembic upgrade head
□ 9. Verify: Check application logs for errors; run smoke tests
□ 10. Document: Log migration in PLAN_REVIEW.md
```

---

*Owner: Team Beta + gstack data-migration.md*  
*Review: Update when new services added or migration tooling changes*

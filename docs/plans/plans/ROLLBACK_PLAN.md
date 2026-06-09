# Rollback & Recovery Plan

## Recovery Point Objectives (RPO) & Recovery Time Objectives (RTO)
| Component | RPO | RTO | Strategy |
|-----------|-----|-----|----------|
| PostgreSQL | 1 hour | 30 min | WAL archiving + hourly backups |
| InvenTree | 1 hour | 15 min | DB restore + media files |
| ERPNext | 1 hour | 30 min | DB restore + files restore |
| Twenty | 1 hour | 15 min | DB restore |
| Paperless | 24 hours | 1 hour | Document files + DB |
| Gateway config | 0 (versioned) | 5 min | Git revert + redeploy |

## Rollback Procedures

### Failed Phase 2 (Business Systems)
```bash
# 1. Stop new containers
docker compose -f docker/inventree.yml down
docker compose -f docker/erpnext.yml down
docker compose -f docker/twenty.yml down

# 2. Restore databases from backup
psql -U postgres inventree_db < backups/inventree_db_YYYYMMDD.sql
psql -U postgres erpnext_db < backups/erpnext_db_YYYYMMDD.sql
psql -U postgres twenty_db < backups/twenty_db_YYYYMMDD.sql

# 3. Restart previous version
docker compose -f docker/inventree.yml up -d --force-recreate
```

### Failed Phase 3 (Integration)
```bash
# 1. Disable webhooks in InvenTree admin
# 2. Stop Gateway
docker compose -f docker/gateway.yml down

# 3. Revert to previous Gateway version
git checkout HEAD~1 services/gateway/
docker compose -f docker/gateway.yml up -d --build

# 4. Verify no stuck events in queue
```

### Failed Phase 4 (UX)
```bash
# 1. Revert Homarr config
git checkout HEAD~1 configs/homarr/
# 2. Restart Homarr
docker compose -f docker/homarr.yml restart
```

## Backup Strategy
| What | When | Where | Retention |
|------|------|-------|-----------|
| PostgreSQL full | Daily 02:00 | `/backups/postgres/` | 30 days |
| InvenTree media | Daily 03:00 | `/backups/inventree-media/` | 30 days |
| Config files | On change | Git repo + `/backups/configs/` | Indefinite |
| Secrets | On change | Password manager + encrypted file | Indefinite |

## Testing Rollback
- **Monthly**: Restore PostgreSQL backup to staging, verify data integrity
- **Per phase**: Document rollback steps in `plans/ROLLBACK_PLAN.md`
- **Pre-deploy**: Verify backup exists before any migration
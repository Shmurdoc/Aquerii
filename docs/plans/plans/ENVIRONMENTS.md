# ENVIRONMENTS — Mine System Enterprise Platform

**Version**: 2.0  
**Status**: AUTHORITATIVE  
**Owner**: Team Alpha (DevOps)  

---

## 1. Environment Overview

| Environment | Purpose | URL | Managed By | Data |
|-------------|---------|-----|------------|------|
| **local** | Developer workstation | localhost | Each developer | Seed data only |
| **staging** | Integration testing, QA, UAT | staging.minesystem.local | CI/CD auto-deploy | Anonymized prod data |
| **production** | Live system | minesystem.local | Manual gate deploy | Real data |

---

## 2. Local Development Environment

### Prerequisites
```
- Docker Desktop 26.x
- Docker Compose 2.27.x
- Python 3.11.9 (for Gateway dev)
- Node.js 20.x (for Twenty frontend dev)
- Git 2.x
```

### Setup Steps
```bash
# 1. Clone repo
git clone https://github.com/org/mine-system
cd mine-system

# 2. Copy env templates (NEVER commit .env files)
cp configs/env/.env.core.example configs/env/.env.core
cp configs/env/.env.gateway.example configs/env/.env.gateway
# Fill in values from team vault (get from Lead)

# 3. Start core infrastructure
docker-compose -f docker/docker-compose.core.yml up -d

# 4. Start services (all or individual)
docker-compose -f docker/docker-compose.inventory.yml up -d
docker-compose -f docker/docker-compose.erp.yml up -d
docker-compose -f docker/docker-compose.crm.yml up -d

# 5. Run database migrations
docker exec mine-gateway python -m alembic upgrade head
docker exec mine-inventree python manage.py migrate

# 6. Load seed data
docker exec mine-gateway python scripts/seed_data.py

# 7. Verify all healthy
./scripts/health-check-all.sh local
```

### Local Overrides (`docker-compose.override.yml`)
```yaml
# docker/docker-compose.override.yml  (gitignored)
# Use this for local development convenience

services:
  gateway:
    volumes:
      - ./services/gateway:/app  # Hot reload
    environment:
      RELOAD: "true"
      LOG_LEVEL: DEBUG

  inventree:
    environment:
      INVENTREE_DEBUG: "true"

  postgres-gateway:
    ports:
      - "5432:5432"  # Expose locally for DB tools (never in staging/prod)
```

### Local Service URLs
| Service | URL |
|---------|-----|
| Homarr Dashboard | http://localhost:8003 |
| FastAPI Gateway | http://localhost:8000 |
| InvenTree | http://localhost:8001 |
| AureusERP | http://localhost:8002 |
| Twenty CRM | http://localhost:3000 |
| Paperless-ngx | http://localhost:8010 |
| YetiForce | http://localhost:8080 |
| HuixiangDou | http://localhost:7860 |
| Excalidraw | http://localhost:3002 |
| Flowchart AI | http://localhost:8020 |
| SigNoz | http://localhost:9000 |
| Zulip | http://localhost:9300 |

---

## 3. Staging Environment

### Purpose
- Integration testing of all services together
- QA testing by team leads
- User Acceptance Testing (UAT) by business stakeholders
- Performance benchmarking
- Pre-production validation

### Data Policy
```
Staging data = Anonymized copy of production data
  - Contact names/emails: replaced with fake data (Faker library)
  - Financial amounts: scaled (multiplied by random factor)
  - Inventory quantities: preserved (not sensitive)
  - Documents: replaced with sample PDFs
  
Refresh schedule: Weekly (Sunday 02:00 UTC)
Refresh script: scripts/refresh-staging-data.sh
```

### Staging Infrastructure
```
Host: staging-server (separate VM from production)
  - 4 CPU, 16GB RAM, 200GB SSD
  - Same Docker version as production
  - Same OS as production (Ubuntu 22.04 LTS)
  - Network: isolated VLAN
  - Access: Team leads + CI/CD service account only
```

### Staging-Specific Config Differences
```yaml
# configs/env/.env.staging (managed in Vault)
ENVIRONMENT=staging
DEBUG=false          # Same as production (never test with debug=true)
LOG_LEVEL=info
CORS_ORIGINS=https://staging.minesystem.local
JWT_EXPIRY=3600      # Same as production
RATE_LIMIT=true      # Same as production
BACKUP_ENABLED=false # Staging doesn't need backup
AUTO_DEPLOY=true     # CI auto-deploys here
```

### Staging Access Controls
- Only accessible via VPN or internal network
- Same RBAC as production (tests real permission logic)
- Separate user accounts from production
- No access to production data, credentials, or Vault

---

## 4. Production Environment

### Infrastructure
```
Host: production-server (dedicated, isolated)
  - 8 CPU, 32GB RAM, 500GB SSD (NVMe)
  - RAID 1 for data volumes
  - Automated off-site backup (S3-compatible MinIO → remote)
  - Monitoring: SigNoz + external uptime monitor
  - Access: Lead + Architect + On-call DevOps ONLY
```

### Production Access Controls
```
SSH access: Lead + Architect (key-based, no password)
Application admin: 2 admin accounts (Lead, Backup Admin)
Database: No direct access except via application
Vault: 3-of-5 unseal keys (distributed to team leads)
Secrets rotation: Every 90 days (automated via Vault policy)
```

### Production Deployment Requirements
1. Staging tests passing for 48+ hours
2. CCB approval documented in PLAN_REVIEW.md
3. No active P0/P1 incidents
4. Not in blackout window (see CI_CD_PIPELINE.md §6)
5. Backup completed in last 1 hour
6. Rollback plan confirmed < 30 min execution
7. On-call engineer available for 2 hours post-deploy

### Production Backup Policy
```
Full backup: Daily at 03:00 UTC
  - All PostgreSQL databases (pg_dump compressed)
  - InvenTree media files (documents, images)
  - Paperless documents
  - Gateway event log
  - Homarr config
  
Retention: 30 daily, 12 monthly, 5 yearly
Storage: Local MinIO + remote S3 (encrypted at rest, AES-256)
Test restore: Monthly (first Sunday of month, 14:00 UTC)
Recovery target: RPO=24h, RTO=2h
```

---

## 5. Environment Parity Rules

To prevent "works on my machine" issues:

1. **Same Docker images** across all environments (only SHA-pinned tags)
2. **Same OS** (Ubuntu 22.04 LTS) on staging and production
3. **Same PostgreSQL version** (15.6) everywhere
4. **Same Redis version** (7.2) everywhere
5. **No environment-specific code paths** (only config differences)
6. **Debug mode OFF** on staging and production
7. **Local volumes** mapped to same paths

---

## 6. Environment-Specific Feature Flags

```python
# services/gateway/config.py
class Settings(BaseSettings):
    ENVIRONMENT: str = "local"  # local | staging | production
    
    # Feature flags (enable features gradually)
    FEATURE_AUTO_PO: bool = True           # Auto-create POs on low stock
    FEATURE_AI_CLASSIFICATION: bool = True  # AI document classification
    FEATURE_FLOWCHART_GEN: bool = False    # Flowchart AI (staging+ only)
    
    # Environment-specific overrides
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def debug_enabled(self) -> bool:
        return self.ENVIRONMENT == "local"
```

---

## 7. Secrets Per Environment

```
LOCAL:
  Source: configs/env/.env.*.example (templates, not real values)
  Real values: In team password manager or shared securely
  
STAGING:
  Source: HashiCorp Vault (staging namespace)
  Injection: Docker secrets or Vault agent sidecar
  
PRODUCTION:
  Source: HashiCorp Vault (production namespace)  
  Injection: Vault agent sidecar ONLY (no .env files)
  Rotation: Automated every 90 days
```

---

*Owner: Team Alpha (DevOps)*  
*Review: Update when new services added or infrastructure changes*

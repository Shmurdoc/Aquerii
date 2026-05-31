# Phase 1: Core Infrastructure Plan

**Duration**: Weeks 1-2  
**Team**: Alpha (Core Infrastructure)  
**Lead**: @Lead | **Architect**: @Architect

---

## Objectives

Build the secure foundation for all services:
1. Reverse Proxy (Caddy) with SSL/TLS
2. Unified Dashboard (Homarr)
3. Database Infrastructure (PostgreSQL)
4. Observability (SigNoz)

---

## Tasks

### 1.1 Caddy Reverse Proxy Setup

| Task | Description | Skills |
|-----|-------------|--------|
| 1.1.1 | Install Caddy via Docker | @Devine Brain (microservices) |
| 1.1.2 | Configure Caddyfile for all services | @gstack-main (review/security) |
| 1.1.3 | Setup SSL/TLS certificates | @gstack-main (review/security) |
| 1.1.4 | Configure auto-HTTPS | @Devine Brain (microservices) |

**Config Location**: `configs/caddy/Caddyfile`

### 1.2 Homarr Unified Dashboard

| Task | Description | Skills |
|-----|-------------|--------|
| 1.2.1 | Deploy Homarr via Docker | @Devine Brain (query) |
| 1.2.2 | Configure app tiles | @Devine Brain (query) |
| 1.2.3 | Setup theme & branding | @elit dev Skills |
| 1.2.4 | Add widget support | @Devine Brain (query) |

**Config Location**: `configs/homarr/`

### 1.3 PostgreSQL Database Infrastructure

| Task | Description | Skills |
|-----|-------------|--------|
| 1.3.1 | Deploy PostgreSQL container | @Devine Brain (microservices) |
| 1.3.2 | Create databases (inventree, erpnext, twenty) | @Devine Brain (terraform) |
| 1.3.3 | Configure connection pooling | @gstack-main (review) |
| 1.3.4 | Setup backup strategy | @RUFLO (autopilot) |
| 1.3.5 | Configure user permissions | @Devine Brain (microservices) |

**Credentials Storage**: `.env` (do not commit)

### 1.4 SigNoz Observability

| Task | Description | Skills |
|-----|-------------|--------|
| 1.4.1 | Deploy SigNoz stack | @RUFLO (autopilot) |
| 1.4.2 | Configure log aggregation | @RUFLO (autopilot) |
| 1.4.3 | Setup metrics collection | @Devine Brain (microservices) |
| 1.4.4 | Configure alerting rules | @gstack-main (review/security) |

---

## Deliverables

- [ ] Caddy running with valid SSL
- [ ] Homarr dashboard accessible
- [ ] PostgreSQL with 3 databases created
- [ ] SigNoz collecting metrics

---

## Dependencies

None (Phase 1 is foundational)

---

## Environment Variables Required

```
# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=mineadmin
POSTGRES_PASSWORD=<secure>
POSTGRES_DB_INVENTREE=inventree
POSTGRES_DB_ERPNEXT=erpnext
POSTGRES_DB_TWENTY=twenty

# Caddy
CADDY_HOST=caddy
CADDY_PORT=80,443

# Homarr
HOMARR_HOST=homarr
HOMARR_PORT=3000

# SigNoz
SIGNOZ_HOST=signoz
SIGNOZ_PORT=3300
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-------------|
| SSL certificate delays | Use Let's Encrypt staging |
| Database connection issues | Use Docker networks |
| Port conflicts | Document all ports in config |

---

*Owner: Team Alpha* | *Status: Planned*
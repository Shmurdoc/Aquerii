# Phase 2: Business Systems Plan

**Duration**: Weeks 3-5  
**Team**: Beta (Business Systems)  
**Lead**: @Lead | **Architect**: @Architect

---

## Objectives

Deploy core business applications:
1. ERPNext (ERP, Invoicing, Finances)
2. Twenty CRM (Customer Data)
3. InvenTree (Inventory Management)
4. Paperless-ngx (Document Hub)

---

## Tasks

### 2.1 ERPNext Deployment

| Task | Description | Skills |
|-----|-------------|--------|
| 2.1.1 | Deploy ERPNext via Docker | @elit dev Skills (code_refactor) |
| 2.1.2 | Configure database connection | @Devine Brain (microservices) |
| 2.1.3 | Setup environment variables | @elit dev Skills |
| 2.1.4 | Run initial site setup | @RUFLO (workflows) |
| 2.1.5 | Configure invoicing modules | @elit dev Skills (code_refactor) |

**Config Location**: `configs/erpnext/`

### 2.2 Twenty CRM Deployment

| Task | Description | Skills |
|-----|-------------|--------|
| 2.2.1 | Deploy Twenty CRM | @Devine Brain (bulletproof-react) |
| 2.2.2 | Configure PostgreSQL connection | @Devine Brain (microservices) |
| 2.2.3 | Setup authentication | @gstack-main (review/security) |
| 2.2.4 | Configure CRM modules | @Devine Brain (bulletproof-react) |

**Config Location**: `configs/twenty/`

### 2.3 InvenTree Deployment (Core Inventory)

| Task | Description | Skills |
|-----|-------------|--------|
| 2.3.1 | Deploy InvenTree via docker-compose | @RUFLO (intelligence) |
| 2.3.2 | Create .env configuration | @gstack-main (review/security) |
| 2.3.3 | Configure volumes (INVENTREE_EXT_VOLUME) | @Devine Brain (microservices) |
| 2.3.4 | Setup database credentials | @RUFLO (intelligence) |
| 2.3.5 | Run initial setup: `invoke update` | @RUFLO (intelligence) |
| 2.3.6 | Configure QR code scanning | @RUFLO (intelligence) |
| 2.3.7 | Setup BOM management | @RUFLO (intelligence) |

**Config Location**: `configs/inventree/`

**Environment Variables**:
```bash
INVENTREE_EXT_VOLUME=/data/inventree
INVENTREE_DB_USER=inventree
INVENTREE_DB_PASSWORD=<secure>
INVENTREE_DB_HOST=postgres
INVENTREE_DB_PORT=5432
```

### 2.4 Paperless-ngx Deployment

| Task | Description | Skills |
|-----|-------------|--------|
| 2.4.1 | Deploy Paperless-ngx | @RUFLO (workflows) |
| 2.4.2 | Configure IBM Docling OCR | @gstack-main (investigate) |
| 2.4.3 | Setup document storage (media/) | @Devine Brain (microservices) |
| 2.4.4 | Configure barcodes | @RUFLO (workflows) |

**Config Location**: `configs/paperless/`

---

## Deliverables

- [ ] ERPNext running with invoicing
- [ ] Twenty CRM accessible
- [ ] InvenTree operational with QR scanning
- [ ] Paperless-ngx processing documents

---

## Dependencies

- Phase 1: PostgreSQL must be running
- Phase 1: Caddy proxy must be configured

---

## InvenTree Specific Notes

Use official `docker-compose.yml`:
```bash
docker compose run --rm inventree-server invoke update
```

Use Python SDK:
- `inventree-sdk` (0.1.1)
- `inventree` Python module

---

## Integration Points

| From | To | Integration |
|------|-----|-------------|
| InvenTree | ERPNext | Create purchase orders on low stock |
| InvenTree | Twenty CRM | Reserve stock on sales |
| Paperless | InvenTree | Auto-ingest supplier documents |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-------------|
| ERPNext resource heavy | Allocate 4+ CPU, 8GB RAM |
| InvenTree first run slow | Increase Docker resources |
| Twenty CRM startup | Use PostgreSQL connection pooling |

---

*Owner: Team Beta* | *Status: Planned*
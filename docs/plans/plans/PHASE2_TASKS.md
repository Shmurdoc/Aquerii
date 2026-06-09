# Phase 2 Tasks — Business Systems Deployment (PRODUCTION-GRADE)

**Phase**: Weeks 6-9  
**Owner**: Team Beta (Business Systems)  
**Goal**: Deploy, configure, seed, and verify all 5 business applications so they are production-ready as standalone systems and ready for Gateway integration in Phase 3.

---

## Prerequisites (Must be complete before Phase 2 starts)

- [ ] Phase 1 exit criteria met (CCB sign-off in PLAN_REVIEW.md)
- [ ] All 6 PostgreSQL databases accepting connections
- [ ] Vault initialized; all service AppRoles created
- [ ] `app_network` and `core_network` running
- [ ] Staging environment configured (T1.9 complete)
- [ ] Phase 1 security gate passed

---

## InvenTree (Weeks 6-7)

### T2.1a: InvenTree Deploy + Migrations

**Owner**: Team Beta (Inventory Specialist)  
**Agent**: R04 test-writer + G04 data-migration  
**Duration**: 1 day  

**Detailed Steps**:
1. Build InvenTree Docker image from `InvenTree-master/` source (pin to commit hash)
2. Create `services/inventree/docker-compose.inventree.yml`
3. Configure environment: `INVENTREE_DB_ENGINE=postgresql`, wire to `inventree_db`
4. Run `invoke migrate` to apply all Django migrations
5. Run `invoke superuser` to create admin account (credentials → Vault)
6. Configure static file serving (WhiteNoise or volume mount)
7. Configure `INVENTREE_MEDIA_ROOT` → MinIO S3 bucket `documents`
8. Enable InvenTree plugins directory (`INVENTREE_PLUGINS_ENABLED=true`)
9. Health check: `GET /api/` returns 200

**Acceptance Criteria**:
- [ ] InvenTree web UI accessible at `inventree.minesystem.local`
- [ ] Admin login works with Vault-stored credentials
- [ ] `GET /api/` returns 200 with version info
- [ ] All Django migrations applied (0 pending)
- [ ] Media files upload to MinIO (test with part image upload)
- [ ] Container running as non-root

---

### T2.1b: InvenTree Part Catalog + Categories

**Owner**: Team Beta  
**Agent**: A01 inventory-forecaster + R08 docs-writer  
**Duration**: 1 day  

**Detailed Steps**:
1. Create top-level categories matching the business part taxonomy
2. Import parts from seed data CSV (see `plans/seed/inventree_parts.csv`)
3. Configure units of measure (each, kg, m, box, etc.)
4. Set reorder points and reorder quantities per part
5. Link parts to supplier (preferred supplier flag)
6. Upload part images where available
7. Verify no duplicate part numbers (IPN must be unique)

**Seed Data Required** (minimum for testing):
- ≥ 20 parts across ≥ 5 categories
- ≥ 5 parts with low stock (below reorder point — for Phase 3 stock sync testing)
- ≥ 3 parts with preferred supplier set

**Acceptance Criteria**:
- [ ] All categories created; hierarchy visible in InvenTree
- [ ] All seed parts imported with no errors
- [ ] `GET /api/part/` returns correct count
- [ ] 5 parts with stock ≤ reorder_point (ready for T3.12 trigger test)
- [ ] Units of measure configured
- [ ] Test: `pytest tests/integration/test_inventree_catalog.py`

---

### T2.1c: InvenTree QR Code System

**Owner**: Team Beta  
**Agent**: R01 architect + R08 docs-writer  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Verify QR code generation endpoint: `GET /api/label/part/{pk}/`
2. Configure label printer plugin (or PDF label generation)
3. Test QR scan → stock adjustment workflow (using browser or QR scanner)
4. Configure QR code to encode InvenTree part URL
5. Generate test labels for 5 parts; verify scan resolves correctly

**Acceptance Criteria**:
- [ ] QR code generated for any part via API
- [ ] QR scan opens correct InvenTree part page
- [ ] Label PDF downloadable
- [ ] Stock adjustment via QR scan confirmed working

---

### T2.1d: InvenTree BOM Versioning

**Owner**: Team Beta  
**Agent**: R04 test-writer + G04 data-migration  
**Duration**: 1 day  

**Detailed Steps**:
1. Create at least 2 assembled parts with multi-level BOMs
2. Test BOM create, submit for approval, approve workflow
3. Test BOM version increment (change qty, submit new version)
4. Test BOM explosion (calculate required sub-parts)
5. Test "can build" calculation given current stock levels
6. Verify BOM changes emit events (for audit trail)

**Acceptance Criteria**:
- [ ] BOM create → approve workflow functional
- [ ] BOM versioning: v1 and v2 exist for test part; v1 frozen after v2 approved
- [ ] BOM explosion calculates correctly (verified manually)
- [ ] "Can Build" quantity matches expected value given stock
- [ ] Test: `pytest tests/integration/test_inventree_bom.py`

---

### T2.1e: InvenTree Lifecycle States

**Owner**: Team Beta  
**Agent**: R01 architect + R04 test-writer  
**Duration**: 0.5 days  

**Lifecycle States**: Active → Deprecated → Retired

**Detailed Steps**:
1. Verify lifecycle state transitions via API
2. Test: Active part can receive stock
3. Test: Deprecated part shows warning; cannot be used in new BOMs
4. Test: Retired part cannot receive stock
5. Verify state change emits InvenTree event (for plugin to forward)

**Acceptance Criteria**:
- [ ] All 3 state transitions functional via API and UI
- [ ] Deprecated part blocked from new BOMs (UI warning + API 400)
- [ ] Retired part stock receipt blocked (API 400)
- [ ] State change events emitted (verify in InvenTree event log)

---

### T2.1f: InvenTree Supplier Management

**Owner**: Team Beta  
**Agent**: A02 vendor-evaluator + R04 test-writer  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Create ≥ 3 suppliers with full details (name, address, currency, payment terms)
2. Link suppliers to parts (supplier part records with SKU, price, lead time)
3. Set preferred supplier per part
4. Test purchase order creation from InvenTree (manual PO, not auto)
5. Verify lead times configured

**Acceptance Criteria**:
- [ ] Suppliers created and visible in InvenTree
- [ ] Parts linked to suppliers with SKU and price
- [ ] Preferred supplier flag set and retrievable via API (`GET /api/company/supplierpart/?preferred=true`)
- [ ] Manual PO creation works

---

### T2.1g: InvenTree Gateway Plugin

**Owner**: Team Beta  
**Agent**: R01 architect + R05 code-reviewer  
**Duration**: 1.5 days  

**This is the critical bridge between InvenTree and the Gateway.**

**Detailed Steps**:
1. Create plugin file: `InvenTree-master/src/backend/InvenTree/plugin/builtin/gateway/gateway_plugin.py`
2. Implement `GatewayPlugin(InvenTreePlugin, EventMixin)`:
   ```python
   PLUGIN_SLUG = 'gateway-bridge'
   PLUGIN_NAME = 'Gateway Event Bridge'
   
   def process_event(self, event, *args, **kwargs):
       payload = self._build_envelope(event, kwargs)
       self._post_to_gateway(payload)
   ```
3. Map InvenTree event names to Gateway event catalog names (per API_CONTRACTS.md)
4. Add HMAC signature to outbound requests (`X-InvenTree-Signature` header)
5. Add retry logic (3 attempts with 2s backoff) for Gateway unreachable
6. Add local event queue for when Gateway is down (SQLite buffer, drain on reconnect)
7. Enable plugin in InvenTree settings
8. Test: trigger `stockitem_saved` event → verify Gateway /events/ingest receives it

**Event Mapping**:
```python
EVENT_MAP = {
    'stockitem_saved': 'inventory.stock.updated',
    'part_saved': 'inventory.part.updated',
    'stocklocation_saved': 'inventory.location.updated',
    'purchaseorder_saved': 'erp.po.updated',
}
# Low stock: calculated in plugin based on stockitem.quantity vs. part.minimum_stock
```

**Acceptance Criteria**:
- [ ] Plugin installed and enabled in InvenTree
- [ ] Stock adjustment → event received at Gateway `/events/ingest` within 5s
- [ ] HMAC signature validates at Gateway (not 401)
- [ ] Gateway unreachable: plugin queues events locally, drains on reconnect
- [ ] Test: `pytest tests/integration/test_inventree_plugin.py`

---

### T2.1h: InvenTree Stocktake Workflow

**Owner**: Team Beta  
**Agent**: A01 inventory-forecaster + R04 test-writer  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Initiate stocktake for a test location
2. Submit count results (some matching, some with discrepancies)
3. Review and confirm discrepancies
4. Verify stock levels updated after reconciliation
5. Verify stocktake report generated

**Acceptance Criteria**:
- [ ] Stocktake initiated, counts submitted, discrepancies flagged
- [ ] Post-reconciliation stock levels match submitted counts
- [ ] Stocktake report downloadable as PDF

---

## AureusERP (Weeks 6-7)

### T2.2a: AureusERP Deploy + Migrations

**Owner**: Team Beta (ERP Specialist)  
**Agent**: G04 data-migration + R04 test-writer  
**Duration**: 1.5 days  

**Detailed Steps**:
1. Build AureusERP Docker image from `aureuserp-master/` (Laravel/Filament stack)
2. Configure `APP_KEY`, `DB_*` env vars via Vault
3. Run `php artisan migrate --force` to apply all migrations
4. Run `php artisan db:seed --class=DefaultSeeder` for initial data
5. Enable required plugins from `plugins/webkul/`:
   - `accounting` (COA, invoices, payments)
   - `purchases` (POs, vendors)
   - `contacts` (customers, vendors)
   - `products` (catalog)
   - `inventories` (stock tracking — mirrors InvenTree)
6. Configure queue worker (Laravel Horizon or `artisan queue:work`)
7. Configure scheduler (`artisan schedule:run` in cron container)
8. Health check: `GET /` returns 200

**Acceptance Criteria**:
- [ ] AureusERP web UI accessible at `erp.minesystem.local`
- [ ] Admin login works
- [ ] All plugins listed above enabled and visible in UI
- [ ] All migrations applied (0 pending)
- [ ] Queue worker running (verify with `artisan horizon:status` or process list)

---

### T2.2b: Chart of Accounts Setup

**Owner**: Team Beta  
**Agent**: A06 erp-admin + R08 docs-writer  
**Duration**: 1 day  

**Detailed Steps**:
1. Configure base currency (GBP or business currency)
2. Import/configure Chart of Accounts for the business
3. Set up fiscal year and accounting periods
4. Configure tax rates (VAT or applicable)
5. Enter opening balances (if migrating from existing system)
6. Configure bank accounts

**Acceptance Criteria**:
- [ ] COA visible in AureusERP Accounting module
- [ ] Fiscal year configured with correct start/end dates
- [ ] Tax rates configured
- [ ] Test invoice created with correct GL account mapping

---

### T2.2c: Products Catalog (Mirrors InvenTree)

**Owner**: Team Beta  
**Agent**: A06 erp-admin + G04 data-migration  
**Duration**: 1 day  

**Detailed Steps**:
1. Import products from same seed data as InvenTree (same IPN = product SKU linkage)
2. Set prices (cost price + sale price) per product
3. Link products to InvenTree part IDs (custom field: `inventree_part_id`)
4. Set product categories matching InvenTree categories
5. Configure product units of measure

**CRITICAL**: Products in AureusERP must have `inventree_part_id` field to enable stock sync in Phase 3.

**Acceptance Criteria**:
- [ ] All seed products imported with `inventree_part_id` populated
- [ ] Product count in AureusERP matches part count in InvenTree
- [ ] `GET /api/products?inventree_part_id={id}` returns correct product
- [ ] Prices configured on all products

---

### T2.2d: Vendor/Supplier Setup

**Owner**: Team Beta  
**Agent**: A02 vendor-evaluator + A06 erp-admin  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Import vendors matching InvenTree suppliers (same company names)
2. Configure payment terms per vendor (net 30, net 60, etc.)
3. Link bank account details
4. Configure default PO delivery address

**Acceptance Criteria**:
- [ ] All InvenTree suppliers exist as vendors in AureusERP
- [ ] Payment terms configured
- [ ] Manual PO creation to vendor works end-to-end

---

### T2.2e: Invoice Templates

**Owner**: Team Beta  
**Agent**: R08 docs-writer + A06 erp-admin  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Customize invoice PDF template (logo, address, terms)
2. Configure auto-numbering (e.g., INV-2026-0001)
3. Configure PO numbering (e.g., PO-2026-0001)
4. Test invoice generation: create invoice → download PDF → verify layout

**Acceptance Criteria**:
- [ ] Invoice PDF downloads correctly with correct branding
- [ ] Auto-numbering increments correctly
- [ ] PO template also customized

---

### T2.2f: AureusERP API Token + Gateway Config

**Owner**: Team Beta  
**Agent**: R02 security-auditor + G01 security  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Generate AureusERP API token (Laravel Sanctum or Passport)
2. Store token in Vault at `secret/aureusrep/api_token`
3. Verify Gateway can authenticate: `GET /api/v1/products` with token → 200
4. Verify Gateway can create POs: `POST /api/v1/purchases/orders` → 201
5. Verify Gateway can create invoices: `POST /api/v1/invoices` → 201
6. Document all AureusERP API endpoints used by Gateway in SERVICE_CATALOG.md

**Acceptance Criteria**:
- [ ] Token in Vault; no token in any config file
- [ ] Gateway test script can authenticate and hit all required AureusERP endpoints
- [ ] Token has minimum required permissions (not admin token)

---

## Twenty CRM (Week 7)

### T2.3a: Twenty CRM Deploy + Migrations

**Owner**: Team Beta  
**Agent**: G04 data-migration + R04 test-writer  
**Duration**: 1 day  

**Detailed Steps**:
1. Build Twenty Docker images from `twenty-main/` source (NestJS backend + React frontend)
2. Configure `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (JWT secret → Vault)
3. Run TypeORM migrations: `yarn workspace @twenty-crm/twenty-server typeorm:run`
4. Configure metadata (custom fields, objects) via Twenty API
5. Verify GraphQL API: `POST /api/` with introspection query returns schema
6. Verify authentication: `POST /auth/login` returns JWT

**Acceptance Criteria**:
- [ ] Twenty web UI accessible at `crm.minesystem.local`
- [ ] Login works; redirects to pipeline view
- [ ] GraphQL introspection returns full schema
- [ ] All migrations applied (0 pending)

---

### T2.3b: Custom Pipeline Stages

**Owner**: Team Beta  
**Agent**: R08 docs-writer + A11 etl-pipeline  
**Duration**: 0.5 days  

**Pipeline**: Lead → Qualified → Proposal Sent → Negotiation → Won / Lost

**Detailed Steps**:
1. Create pipeline stages via Twenty UI or API mutation
2. Configure probability per stage (Lead: 10%, Qualified: 30%, etc.)
3. Create custom fields on Deal: `invoice_id` (string), `inventree_reservation_id` (string)
4. Configure stage transition rules

**Acceptance Criteria**:
- [ ] All 6 pipeline stages created
- [ ] Custom fields `invoice_id` and `inventree_reservation_id` exist on Deal object
- [ ] Deal can be moved through all stages
- [ ] `Won` stage transition fires webhook (verified in T2.3d)

---

### T2.3c: Contact + Company Import

**Owner**: Team Beta  
**Agent**: A11 etl-pipeline + G04 data-migration  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Import seed contacts (≥ 10) with: name, email, phone, company
2. Import seed companies (≥ 5) with: name, address, domain
3. Link contacts to companies
4. Verify no duplicate contacts (email dedup)

**Acceptance Criteria**:
- [ ] All seed contacts and companies imported
- [ ] No duplicates (check via GraphQL query)
- [ ] `crm.contact.created` events NOT fired during bulk import (suppress during seed)

---

### T2.3d: Twenty Webhook Configuration

**Owner**: Team Beta  
**Agent**: R01 architect + R04 test-writer  
**Duration**: 0.5 days  

**Webhooks to Configure**:
```
contact.created   → https://gateway.minesystem.local/events/ingest
contact.updated   → https://gateway.minesystem.local/events/ingest
deal.created      → https://gateway.minesystem.local/events/ingest
deal.updated      → https://gateway.minesystem.local/events/ingest
deal.stageChanged → https://gateway.minesystem.local/events/ingest
```

**Acceptance Criteria**:
- [ ] All 5 webhooks configured in Twenty
- [ ] Create test contact → Gateway `/events/ingest` receives `crm.contact.created` event within 5s
- [ ] Move deal to Won → Gateway receives `crm.deal.won` event within 5s
- [ ] Webhook payload matches API_CONTRACTS.md event envelope spec

---

### T2.3e: Twenty GraphQL Token + Gateway Config

**Owner**: Team Beta  
**Agent**: R02 security-auditor + G01 security  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Generate service account API token in Twenty
2. Store in Vault at `secret/twenty/api_token`
3. Test Gateway → Twenty GraphQL query (contacts list)
4. Test Gateway → Twenty GraphQL mutation (update deal custom field)

**Acceptance Criteria**:
- [ ] Token in Vault
- [ ] Gateway test: `query { contacts { edges { node { id name } } } }` returns data
- [ ] Gateway test: mutation updates `invoice_id` on a deal

---

## Paperless-ngx (Week 7)

### T2.4a: Paperless-ngx Deploy

**Owner**: Team Beta  
**Agent**: A09 infra-monitor + R04 test-writer  
**Duration**: 1 day  

**Detailed Steps**:
1. Deploy Paperless-ngx from Docker Hub (pin version)
2. Configure: `PAPERLESS_DBHOST`, `PAPERLESS_REDIS`, `PAPERLESS_MEDIA_ROOT` → MinIO
3. Configure OCR language: English + any additional languages
4. Configure `PAPERLESS_OCR_MODE=redo` (re-OCR all imported docs)
5. Configure `PAPERLESS_CONSUMER_POLLING=30` (poll inbox every 30s)
6. Create admin user (credentials → Vault)
7. Test document upload via API: `POST /api/documents/post_document/`

**Acceptance Criteria**:
- [ ] Paperless UI accessible at `paperless.minesystem.local`
- [ ] Document upload via API returns 200 with task_id
- [ ] OCR completes within 60s for single-page PDF
- [ ] Document visible in UI after OCR completes

---

### T2.4b: Document Types + Auto-Classification Rules

**Owner**: Team Beta  
**Agent**: R08 docs-writer + A06 erp-admin  
**Duration**: 0.5 days  

**Document Types**: Invoice, Purchase Order, Contract, Quote, Delivery Note, Technical Spec

**Detailed Steps**:
1. Create document types with expected content keywords
2. Create auto-classification rules (keyword → document type + tag)
3. Create correspondent auto-assignment rules (sender email domain → correspondent)
4. Test: upload sample invoice PDF → verify auto-tagged as "Invoice" + correspondent set

**Acceptance Criteria**:
- [ ] All 6 document types created
- [ ] Auto-classification rule fires correctly on test invoice PDF
- [ ] Correspondent auto-assigned based on sender

---

### T2.4c: Paperless Webhook + Gateway Config

**Owner**: Team Beta  
**Agent**: R01 architect + R04 test-writer  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Configure Paperless-ngx post-consume script to call Gateway on OCR complete
2. Or use `PAPERLESS_POST_CONSUME_SCRIPT` pointing to webhook forwarder
3. Payload must include: document_id, document_type, tags, correspondent, content preview
4. Store Paperless API token in Vault at `secret/paperless/api_token`

**Acceptance Criteria**:
- [ ] Upload document → OCR completes → Gateway `/events/ingest` receives `document.ocr.complete` within 60s
- [ ] Gateway can fetch document content: `GET /api/documents/{id}/` with Vault token → 200
- [ ] Event payload includes document_id and document_type

---

## YetiForceCRM (Week 8)

### T2.5a: YetiForce Deploy + Initial Config

**Owner**: Team Beta  
**Agent**: G04 data-migration + R07 refactoring  
**Duration**: 1.5 days  

**Detailed Steps**:
1. Build YetiForce Docker image from `YetiForceCRM-developer/` (PHP/Laravel)
2. Configure database connection to `yetiforce_db`
3. Run YetiForce installer (web-based or CLI)
4. Configure admin credentials (→ Vault)
5. Set company name, logo, timezone, currency
6. Verify PHP extensions installed (GD, intl, mbstring, etc. — per YetiForce requirements)

**Acceptance Criteria**:
- [ ] YetiForce web UI accessible at `yetiforce.minesystem.local`
- [ ] Admin login works
- [ ] Company profile configured
- [ ] No PHP errors in logs

---

### T2.5b: YetiForce Modules — Helpdesk, Assets, Contracts

**Owner**: Team Beta  
**Agent**: R07 refactoring + R08 docs-writer  
**Duration**: 1 day  

**Detailed Steps**:
1. Enable HelpDesk module: configure ticket categories, priorities, SLA rules
2. Enable Assets module: configure asset categories (IT, Equipment, Vehicles)
3. Enable Contracts module: configure contract types (maintenance, service, NDA)
4. Create test records: 2 tickets, 3 assets, 1 contract
5. Verify all 3 modules visible and functional

**Acceptance Criteria**:
- [ ] HelpDesk: ticket created, assigned, resolved workflow works
- [ ] Assets: asset record created with serial number and assignment
- [ ] Contracts: contract created with start/end dates and linked contact
- [ ] All modules accessible from YetiForce main menu

---

### T2.5c: YetiForce API Key + Gateway Config

**Owner**: Team Beta  
**Agent**: R02 security-auditor + G01 security  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Generate YetiForce WebService API key
2. Store in Vault at `secret/yetiforce/api_key`
3. Test Gateway → YetiForce: `GET /webservice/v1/Contacts` with API key → 200
4. Test Gateway → YetiForce: `POST /webservice/v1/Contacts` creates contact

**Acceptance Criteria**:
- [ ] API key in Vault; no key in config files
- [ ] Gateway test: list contacts and create contact both work

---

### T2.5d: Contact Sync — Twenty ↔ YetiForce

**Owner**: Team Beta  
**Agent**: A11 etl-pipeline + R04 test-writer  
**Duration**: 1 day  

**Sync Rules**:
- Twenty → YetiForce: new contact in Twenty → create in YetiForce (within 30s)
- YetiForce → Twenty: new contact in YetiForce helpdesk → create in Twenty (within 30s)
- Deduplication: match on email address; never create duplicate
- Loop prevention: contacts created by sync have `sync_source: gateway` tag; suppress re-sync

**Detailed Steps**:
1. Create test contact in Twenty → verify appears in YetiForce within 30s (via Gateway event bus)
2. Create test contact in YetiForce → verify appears in Twenty within 30s
3. Test deduplication: create same email in both → only 1 contact created

**Acceptance Criteria**:
- [ ] Twenty → YetiForce sync works within 30s
- [ ] YetiForce → Twenty sync works within 30s
- [ ] Duplicate email: no duplicate created
- [ ] Loop prevention verified: sync doesn't cycle indefinitely
- [ ] Test: `pytest tests/integration/test_contact_sync.py`

---

## Data Migration & Integrity (Week 9)

### T2.6a: Seed Data — All Services

**Owner**: Team Beta  
**Agent**: G04 data-migration + A11 etl-pipeline  
**Duration**: 1.5 days  

**Seed Scripts Required**:
- `seeds/inventree_seed.py` — parts, categories, stock, suppliers
- `seeds/aureusrep_seed.py` — products, vendors, COA entries
- `seeds/twenty_seed.py` — contacts, companies, pipeline deals
- `seeds/paperless_seed.py` — upload sample documents
- `seeds/yetiforce_seed.py` — contacts, assets, test tickets

**Acceptance Criteria**:
- [ ] All 5 seed scripts run without error on clean databases
- [ ] Seed scripts are idempotent (safe to run twice — no duplicate errors)
- [ ] Data visible in each service UI after seed
- [ ] InvenTree + AureusERP products share same `inventree_part_id` references

---

### T2.6b: Phase 2 Data Integrity Tests

**Owner**: Team Beta  
**Agent**: R04 test-writer + G04 data-migration  
**Duration**: 1 day  

**Tests**:
1. InvenTree part IDs match AureusERP `inventree_part_id` references (no orphans)
2. InvenTree suppliers exist as AureusERP vendors (name match)
3. Twenty contacts all have valid email addresses
4. Paperless documents all have document_type assigned (no unclassified)
5. YetiForce assets all have assigned contacts
6. No cross-service record count mismatches from seed

**Acceptance Criteria**:
- [ ] `pytest tests/integration/test_data_integrity.py` passes (0 failures)
- [ ] 0 orphaned records across services
- [ ] Data integrity report logged and archived

---

### T2.6c: Phase 2 Security Gate

**Owner**: Security Lead  
**Agent**: G01 security + R02 security-auditor  
**Duration**: 0.5 days  

**G01 Phase 2 Checklist**:
- [ ] All 5 service API tokens in Vault (no tokens in config files)
- [ ] All services running as non-root
- [ ] All services only accessible via Caddy (no direct port exposure)
- [ ] No debug mode enabled on any service (check `APP_DEBUG`, `DEBUG`, etc.)
- [ ] All services using pinned Docker image versions
- [ ] No default admin passwords left (all changed, stored in Vault)
- [ ] Database users have minimum required permissions (not superuser)
- [ ] Trivy scan: 0 Critical CVEs on all Phase 2 images
- [ ] RBAC: service tokens cannot access other services' data
- [ ] All inbound webhooks verify HMAC/signature

**Sign-off**: Record in `plans/PLAN_REVIEW.md` Phase 2→3 gate section.

---

## Phase 2 Exit Criteria

- [ ] All 22 tasks complete (T2.1a–T2.6c)
- [ ] All 5 services healthy and accessible via Caddy
- [ ] All API tokens in Vault
- [ ] Seed data loaded; data integrity tests pass
- [ ] Contact sync (Twenty ↔ YetiForce) working end-to-end
- [ ] InvenTree Gateway plugin emitting events
- [ ] Staging stable for 48 hours without critical errors
- [ ] Phase 2 security gate passed (G01 sign-off in PLAN_REVIEW.md)
- [ ] No P0/P1 open issues

---

*Owner: Team Beta (Business Systems)*  
*Agent Support: R01, R02, R04, R05, R07, R08, G01, G03, G04, A01, A02, A06, A09, A11, O01*

# Aquerii — Enterprise Feature Plans

This directory contains expert-level plan documents for every major feature in the Aquerii enterprise roadmap. **All features must be fully documented here before implementation begins.**

---

## Plan Documents

| Plan | Domain | Status | Priority |
|------|--------|--------|----------|
| [RBAC.md](./RBAC.md) | Auth / Security | Enhanced Draft | P0 |
| [COMPANY_BRANDING.md](./COMPANY_BRANDING.md) | Branding / Identity | Draft | P0 |
| [INVOICE_PDF.md](./INVOICE_PDF.md) | ERP / Documents | Enhanced Draft | P0 |
| [DOCUMENT_TEMPLATES.md](./DOCUMENT_TEMPLATES.md) | ERP / Documents | Enhanced Draft | P0 |
| [SO_INVOICE_WORKFLOW.md](./SO_INVOICE_WORKFLOW.md) | ERP / Sales | Enhanced Draft | P1 |
| [ENTITY_LINKING.md](./ENTITY_LINKING.md) | CRM / ERP | Enhanced Draft | P1 |
| [BULK_OPERATIONS.md](./BULK_OPERATIONS.md) | All Modules | Draft | P1 |
| [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) | Frontend | Enhanced Draft | P1 |
| [REPORTING_ANALYTICS.md](./REPORTING_ANALYTICS.md) | BI / Dashboard | Draft | P2 |
| [SEARCH_COMMAND.md](./SEARCH_COMMAND.md) | Frontend / UX | Draft | P2 |
| [MEETING_VIDEO.md](./MEETING_VIDEO.md) | Collaboration | Enhanced Draft | P2 |
| [EMPLOYEE_DAILY.md](./EMPLOYEE_DAILY.md) | HR / Team | Draft | P3 |

---

## Implementation Order

### P0 — Security, Branding & Core Documents (ship first)

1. **Priority 0 Security Fixes** (no plan doc needed — fix inline)
   - RLS SQL injection: `SetWorkspaceTenant.php:38`
   - Storage quota column bug: `FileController.php:48`

2. **COMPANY_BRANDING** — logo upload endpoint, `WorkspaceResource` branding fields, public `/api/branding` subdomain resolution, `InitialsAvatar` component, login page branding, sidebar logo, email layout with dynamic logo, Settings > General logo upload UI, Settings > Documents template selector

3. **RBAC** — 4-tier hierarchy, policies, middleware, 2FA enforcement, `platform_admins` table

4. **DOCUMENT_TEMPLATES + INVOICE_PDF** — Gotenberg Docker service, `SequenceService`, all 7 PDF templates × 3 layouts (Modern / Classic / Minimal), logo/branding injection per template, `Settings > Documents` panel

### P1 — Core ERP Workflow

4. **SO_INVOICE_WORKFLOW** — Quote → SO → Invoice → Payment → Receipt state machines; credit notes; recurring invoices

5. **ENTITY_LINKING** — `crm_companies` entity_type + FK links from SO/Invoice/PO; `EntitySelector` component; Entity 360 view; CRM DnD pipeline

6. **BULK_OPERATIONS** — Soft deletes on all P0 models; `BulkActionBar`; `useMultiSelect` hook; bulk send/delete/restore/export

7. **UI_DESIGN_SYSTEM** — Design token layer; collapsible sidebar; 6 accent themes; component library; dashboard overhaul

### P2 — Intelligence & Collaboration

8. **REPORTING_ANALYTICS** — Dashboard widgets with live data; `/reports` section; hand-rolled SVG charts; CSV/PDF export

9. **SEARCH_COMMAND** — `Ctrl+K` command palette; global search across 8 resource types; recent history; Phase 2 command mode

10. **MEETING_VIDEO** — `meetings` + `meeting_attendees` + `oauth_accounts` tables; Zoom/Teams OAuth; ICS email invitations; calendar + list view

### P3 — Team Operations

11. **EMPLOYEE_DAILY** — HR directory; attendance clock-in/out; leave requests + approval + balance; expense claims + receipt upload + payroll export

---

## Cross-Cutting Concerns

### New Docker Services Required
- **Gotenberg** (`gotenberg/gotenberg:8`) — PDF generation. Add to `docker-compose.yml` before implementing DOCUMENT_TEMPLATES.
- **Meilisearch** (`getmeili/meilisearch:v1.7`) — Phase 2 search scaling. Not needed for Phase 1 (uses PostgreSQL FTS).

### New Environment Variables Required
```
GOTENBERG_URL=http://gotenberg:3000
MEILISEARCH_URL=http://meilisearch:7700     # Phase 2
MEILISEARCH_KEY=your_master_key             # Phase 2
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

### Shared New Tables (ordered by dependency)
```
document_sequences          → needed by DOCUMENT_TEMPLATES (P0)
oauth_accounts              → needed by MEETING_VIDEO (P2)
invoice_payments            → needed by SO_INVOICE_WORKFLOW (P1)
credit_notes                → needed by SO_INVOICE_WORKFLOW (P1)
recurring_invoices          → needed by SO_INVOICE_WORKFLOW (P1)
attendance_logs             → needed by EMPLOYEE_DAILY (P3)
leave_types                 → needed by EMPLOYEE_DAILY (P3)
leave_requests              → needed by EMPLOYEE_DAILY (P3)
expense_claims              → needed by EMPLOYEE_DAILY (P3)
meetings                    → needed by MEETING_VIDEO (P2)
meeting_attendees           → needed by MEETING_VIDEO (P2)
```

### Migrations That Alter Existing Tables
```
workspace_members           + HR fields (EMPLOYEE_DAILY)
workspace.settings          + doc_prefix, brand_colour, VAT, bank_details (DOCUMENT_TEMPLATES)
invoices                    + customer_company_id, discount, amount_paid, public_token (multiple)
sales_orders                + customer_company_id, invoice_status, discount (multiple)
purchase_orders             + supplier_company_id, discount (multiple)
crm_companies               + entity_type, payment_terms, credit_limit, soft delete (ENTITY_LINKING)
crm_contacts                + soft delete (BULK_OPERATIONS)
crm_deals                   + soft delete (BULK_OPERATIONS)
products                    + soft delete (BULK_OPERATIONS)
workspace_members.role      + rename 'admin' → 'manager' (RBAC)
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PDF generation | Gotenberg (Chromium-based) | Pixel-perfect, no PHP library quirks, CSS grid support |
| Search (Phase 1) | PostgreSQL FTS (`tsvector`) | No new infrastructure, adequate for <100k records |
| Search (Phase 2) | Meilisearch | Sub-10ms, typo-tolerant, simple Docker sidecar |
| OAuth token storage | `oauth_accounts` table | Shared by Zoom, Teams, Google; reusable pattern |
| Soft deletes | Laravel `SoftDeletes` trait | Standard; `WHERE deleted_at IS NULL` global scope |
| Bulk operations | `/bulk` endpoint + `BulkActionHandlerFactory` | Single contract; easily extensible to new resources |
| Charts | Hand-rolled SVG | Zero dependency; matches reference design; token-aware |
| Salary encryption | Laravel `Encryptable` cast | AES-256; transparent at model level |
| DnD (CRM pipeline) | `@dnd-kit/sortable` | Best-in-class React DnD; accessible |

---

## Known Blockers

| Blocker | Affects | Resolution |
|---------|---------|------------|
| No `pdo_pgsql` locally | Backend tests | Run `docker compose exec api php artisan test` instead |
| ESLint not configured | Frontend linting | Add `.eslintrc.cjs` in Phase 1 (UI_DESIGN_SYSTEM) |
| No Gotenberg sidecar yet | PDF export | Add to `docker-compose.yml` as part of DOCUMENT_TEMPLATES |

---

*Last updated: 2026-05-25*

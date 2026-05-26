# CRM System — Implementation Plan

## Architecture Overview

This plan extends the existing modular monolith. CRM features live under:
- **API:** `app/Modules/CRM/` (Models, Controllers, Providers) — existing module
- **New:** `app/Modules/Support/` — ticketing, knowledge base, SLA
- **New:** `app/Modules/Marketing/` — campaigns, email marketing, segmentation
- **Frontend:** `services/web/src/pages/crm/`, `services/web/src/components/crm/` — plus new Support & Marketing page trees
- **AI:** `services/ai/app/routers/crm.py` — enhanced with new AI features
- **DB:** Follow existing patterns: UUID PKs, timestamptz, jsonb, soft-deletes

---

## Phase 1 — Core Contact & Lead Engine

### 1.1 Enhanced Contact Model
**File:** `app/Modules/CRM/Models/CrmContact.php`
- Add fields: `job_title`, `social_links` (jsonb), `lifecycle_stage`, `consent_gdpr`, `consent_marketing`, `consent_preferences` (jsonb), `last_touched_at`, `source`, `source_url`
- Add self-referential relationship for contact mapping

**Migration:** `database/migrations/2026_05_27_000001_enhance_crm_contacts.php`

### 1.2 Contact Relationship Mapping
**File (new):** `app/Modules/CRM/Models/CrmContactRelationship.php`
- Table: `crm_contact_relationships` — `contact_id`, `related_contact_id`, `relationship_type` (reports_to/decision_maker/colleague/spouse)

### 1.3 Duplicate Detection & Merging
**File (new):** `app/Modules/CRM/Services/DuplicateDetectionService.php`
- Configurable match rules, `findDuplicates()`, `mergeContacts()`

**Endpoints (add to ContactController):** `POST contacts/{contact}/merge`, `GET contacts/duplicates`

### 1.4 Lifecycle Stage Tracking
**File (new):** `app/Modules/CRM/Services/ContactLifecycleService.php`
- `transition(contact, toStage)` — validates transitions, logs history, triggers automation
- History table: `crm_contact_stage_history`

### 1.5 CSV Bulk Import
**Files (new):** `ImportCrmContactsJob.php`, `ContactImportController.php`
- **Endpoint:** `POST crm/contacts/import`, `GET crm/contacts/import/{id}/status`

### 1.6 Data Decay Alerts
**File (new):** `app/Modules/CRM/Console/Commands/AlertStaleContacts.php`
- Scheduled command, registered in `routes/console.php`

### 1.7 Lead Management
**File (new):** `app/Modules/CRM/Models/CrmLead.php`
- Table: `crm_leads` — source, score, status, assigned_to, convert link

**File (new):** `app/Modules/CRM/Http/Controllers/LeadController.php`
- CRUD + `POST assign`, `POST convert/{lead}` (creates contact + deal)

**Routes:**
```php
Route::apiResource('crm/leads', LeadController::class);
Route::post('crm/leads/{lead}/assign', [LeadController::class, 'assign']);
Route::post('crm/leads/{lead}/convert', [LeadController::class, 'convert']);
```

### 1.8 Consent Tracking
**File (new):** `app/Modules/CRM/Http/Controllers/ConsentController.php`
- GDPR/POPIA/CCPA consent management endpoints

### 1.9 Frontend: Enhanced Contacts & Leads
- **New/rewritten:** `ContactsPage.tsx`, `ContactTable.tsx`, `ContactImportModal.tsx`, `LeadsPage.tsx`, `LeadConvertModal.tsx`
- **Updated:** `ContactDrawer.tsx` (tabs: Details, Activity, Relationships, Deals, Consent), `lib/crm.ts`

### 1.10 Context Panel Update
**File:** `services/web/src/components/layout/ContextPanel.tsx`
```typescript
'/crm': { label: 'CRM', items: [
  { to: '/crm', label: 'Deals' }, { to: '/crm/contacts', label: 'Contacts' },
  { to: '/crm/leads', label: 'Leads' }, { to: '/crm/companies', label: 'Companies' },
]},
```

---

## Phase 2 — Sales Acceleration

### 2.1 Enhanced Deal Model
**File (update):** `app/Modules/CRM/Models/CrmDeal.php`
- Add: `loss_reason`, `loss_details`, `forecast_category`, `discount_amount`, `discount_type`, `competitors` (jsonb), `last_activity_at`

### 2.2 Win/Loss Tracking
**Endpoints (add to DealController):** `POST deals/{deal}/won`, `POST deals/{deal}/lost`

### 2.3 Multi-Currency
**File (new):** `app/Modules/CRM/Services/CurrencyService.php`

### 2.4 Sales Forecasting
**File (new):** `app/Modules/CRM/Http/Controllers/ForecastController.php`
- `GET crm/forecast`, `GET crm/forecast/by-rep`, `GET crm/forecast/by-pipeline`

### 2.5 Quota Tracking
**Files (new):** `CrmQuota.php`, `QuotaController.php`
- Table: `crm_quotas` — per-rep targets with attainment computation

### 2.6 Sequences / Cadences
**Files (new):** `CrmSequence.php`, `CrmSequenceEnrollment.php`, `SequenceController.php`, `AdvanceSequencesJob.php`
- Automated multi-step outreach with email/call/wait steps

### 2.7 Call Logging
**Files (new):** `CallLogController.php`, migration `crm_call_logs`

### 2.8 Frontend
- **New pages:** `ForecastPage.tsx`, `QuotasPage.tsx`, `SequencesPage.tsx`
- **Updated:** `CRMPage.tsx` (forecast/quotas tabs, enhanced deal cards)

---

## Phase 3 — Customer Service & Support

### 3.1 New Module: Support
**Provider:** `app/Modules/Support/Providers/SupportServiceProvider.php` (gated by `MODULE_SUPPORT`)

**Models (5 new):**
- `Ticket` — omnichannel ticket (status, priority, channel, SLA fields)
- `TicketMessage` — message thread with `is_internal` flag
- `TicketSla` — SLA policy definitions
- `SlaBreach` — breach records
- `KnowledgeBaseArticle` — KB articles with vote tracking

**Migrations:** 5 tables

### 3.2 Controllers & Routes
- `TicketController` — CRUD, assign, merge
- `TicketMessageController` — CRUD for ticket messages
- `SlaController` — SLA policy CRUD, breach report, compliance stats
- `KnowledgeBaseController` — CRUD, search, vote, AI-suggest
- `EnforceSlaJob` — scheduled breach detection + escalation

### 3.3 Frontend
- `TicketsPage.tsx` — inbox with filters, SLA indicators
- `TicketDetailPage.tsx` — thread view, reply composer, collision detection
- `KnowledgeBasePage.tsx` — article list, editor, analytics
- `SlaPage.tsx` — policies, breach log, compliance chart

---

## Phase 4 — Marketing Automation

### 4.1 New Module: Marketing
**Provider:** `app/Modules/Marketing/Providers/MarketingServiceProvider.php` (gated by `MODULE_MARKETING`)

**Models (4 new):**
- `Campaign` — multi-channel campaigns with budget/ROI tracking
- `CampaignAudience` — per-contact campaign status (queued/sent/opened/clicked/converted)
- `EmailTemplate` — templates with personalization tokens
- `Segment` — saved criteria-based audiences with cached counts

**Migrations:** 4 tables

### 4.2 Controllers & Routes
- `CampaignController` — CRUD, launch, performance stats
- `EmailTemplateController` — CRUD
- `SegmentController` — CRUD, calculate count
- `CampaignService` — audience builder, send orchestration

### 4.3 Frontend
- `CampaignsPage.tsx` — list, wizard, performance charts
- `EmailTemplatesPage.tsx` — template builder with token picker
- `SegmentsPage.tsx` — visual segment builder with preview

---

## Phase 5 — Analytics & Reporting

### 5.1 API Endpoints
**File (new):** `app/Modules/CRM/Http/Controllers/CrmReportController.php`
- `pipeline-velocity`, `revenue`, `activities`, `win-loss`, `lead-sources`

**File (new):** `app/Modules/CRM/Http/Controllers/CrmAnalyticsController.php`
- `cohort`, `funnel`, `churn-risk`, `clv`

### 5.2 Frontend
- `ReportsPage.tsx` — tabbed reports with charts, date range picker, CSV/PDF export
- `DashboardPage.tsx` — role-based configurable widget grid

---

## Phase 6 — Workflow & Process Automation

### 6.1 CRM Automation Triggers
**File (new):** `app/Modules/CRM/Services/CrmAutomationService.php`
- Triggers: contact.created, contact.stage_changed, contact.score_threshold, deal.created, deal.stage_changed, deal.won, deal.lost, deal.aging, ticket.created, ticket.sla_breach

### 6.2 Approval Workflows
**Files (new):** `CrmApprovalRule.php`, `DealApprovalService.php`
- Threshold-based deal approval chains with escalation

---

## Phase 7 — Integrations

### 7.1 Calendar Sync
**File (new):** `CalendarSyncService.php` — Google Calendar + Outlook (uses existing OAuth)

### 7.2 Telephony
**File (new):** `TelephonyService.php` — Twilio click-to-dial, call recording

### 7.3 Product Catalogue
**Files (new):** `CrmProduct.php`, `ProductController.php` — CRM-specific pricing catalogue

### 7.4 Quote Builder
**Files (new):** `CrmQuote.php`, `QuoteController.php` — PDF generation, email send, accept/reject

---

## Phase 8 — AI Enhancements

### 8.1 AI Router Updates
**File (update):** `services/ai/app/routers/crm.py`
- New endpoints: `/crm/deal-summary`, `/crm/churn-risk`, `/crm/next-action`, `/crm/email-compose`, `/crm/data-clean`, `/crm/anomaly-detection`

### 8.2 API Integration
**File (update):** `services/api/app/Modules/AI/Http/Controllers/AIController.php`
- New methods forwarding to AI service

---

## Summary: New Tables (19 total)

| Phase | Table | Purpose |
|-------|-------|---------|
| 1 | `crm_contact_relationships` | Contact relationship mapping |
| 1 | `crm_contact_stage_history` | Lifecycle stage audit trail |
| 1 | `crm_leads` | Lead capture & scoring |
| 2 | `crm_quotas` | Sales quota targets |
| 2 | `crm_sequences` | Outreach sequences |
| 2 | `crm_sequence_enrollments` | Sequence enrollments |
| 2 | `crm_call_logs` | Call logging |
| 2 | `crm_approval_rules` | Deal approval workflows |
| 3 | `support_tickets` | Support tickets (omnichannel) |
| 3 | `support_ticket_messages` | Ticket message thread |
| 3 | `support_ticket_slas` | SLA policy definitions |
| 3 | `support_sla_breaches` | SLA breach records |
| 3 | `support_kb_articles` | Knowledge base articles |
| 4 | `marketing_campaigns` | Marketing campaigns |
| 4 | `marketing_campaign_audiences` | Campaign contact assignments |
| 4 | `marketing_email_templates` | Email templates |
| 4 | `marketing_segments` | Saved audience segments |
| 7 | `crm_products` | CRM product catalogue |
| 7 | `crm_quotes` | Quotes & proposals |

## Module Registration

**`.env` additions:**
```
MODULE_SUPPORT=true
MODULE_MARKETING=true
```

**File (update):** `app/Core/Providers/ModuleServiceProvider.php`
```php
$this->registerIf('MODULE_SUPPORT',   \App\Modules\Support\Providers\SupportServiceProvider::class);
$this->registerIf('MODULE_MARKETING', \App\Modules\Marketing\Providers\MarketingServiceProvider::class);
```

## Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

Each phase:
1. Write migrations → `php artisan make:migration`
2. Create models in `app/Modules/{Module}/Models/`
3. Create services, controllers, jobs in appropriate directories
4. Register routes in `routes/api.php` or `routes/modules/{module}.php`
5. Run `docker compose exec api php artisan migrate`
6. Create frontend pages in `services/web/src/pages/{module}/`
7. Create components in `services/web/src/components/{module}/`
8. Register routes in `App.tsx`, nav items in `NavRail.tsx`, context panel in `ContextPanel.tsx`
9. Run `npm run lint && npm run typecheck`
10. Run `docker compose exec api php artisan test` + `npx vitest run`

## Key Conventions

- UUID primary keys: `$table->uuid('id')->primary()`
- Timestamps: `timestampsTz()` / `softDeletesTz()`
- Flexible data: `jsonb` columns with `'array'` or `'object'` Eloquent casts
- All workspace-scoped routes gated by `MODULE_*` env vars via ModuleServiceProvider
- Response envelope: `['data' => ...]`
- Frontend: React 18 + `@tanstack/react-query` + `zustand` + `lucide-react` + Tailwind CSS
- API client: shared Axios instance in `lib/api.ts` with auto-auth + idempotency keys
- RBAC: permission strings like `crm.*`, `support.*`, `marketing.*` — defined in `usePermission.ts`

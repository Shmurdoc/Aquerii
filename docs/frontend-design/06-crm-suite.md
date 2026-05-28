# CRM Suite — Frontend Design

## Overview

The CRM module manages deals, contacts, companies, leads, pipelines, and reports. It's designed for sales teams who need pipeline visibility, contact management, lead scoring, and forecasting. This is a full suite — not a toy CRM. Every sub-view must handle real-world data volumes (10k+ contacts, 2k+ deals, multiple pipelines).

## Architecture

### Routes

```
/workspaces/{workspaceId}/crm                    → CRMPage (default tab: Deals)
/workspaces/{workspaceId}/crm/deals              → Deals tab
/workspaces/{workspaceId}/crm/contacts           → Contacts tab
/workspaces/{workspaceId}/crm/companies          → Companies tab
/workspaces/{workspaceId}/crm/leads              → Leads tab
/workspaces/{workspaceId}/crm/pipelines          → Pipeline Manager tab
/workspaces/{workspaceId}/crm/reports            → Reports tab
```

### Component Tree

```
CRMPage
├── CRMHeader (page title, workspace selector breadcrumb)
├── CRMTabs (Deals | Contacts | Companies | Leads | Pipelines | Reports)
│   └── [Content rendered per active tab]
│
├── [DealsTab]
│   ├── DealsToolbar
│   │   ├── ViewToggle (Kanban | Table)
│   │   ├── PipelineSelector (dropdown, if workspace has multiple)
│   │   ├── FilterBar (stage, value range, assignee, company, close_date)
│   │   ├── SearchInput
│   │   ├── CreateDealButton → DealFormModal
│   │   └── ImportButton (future: CSV import)
│   ├── [KanbanView] (same drag-drop pattern as boards — reuse KanbanColumn)
│   │   └── PipelineColumn (per stage, droppable)
│   │       └── DealCard (value, company, contact, stage color, close date)
│   │           ├── ValueBadge (formatted currency)
│   │           ├── DealTitle (click → deal drawer)
│   │           ├── CompanyName (if set)
│   │           ├── ContactAvatar (if set)
│   │           ├── CloseDateChip
│   │           └── Tags (truncated to 2)
│   ├── [TableView]
│   │   └── DealsDataTable (sortable, paginated, batch select)
│   └── DealDrawer
│       ├── DealHeader (title, value, stage, pipeline)
│       ├── DealDetails (expected close date, contact, company, owner)
│       ├── AI Score Button → calls POST /api/crm/deals/{id}/score
│       │   └── ScoreResultDisplay (number 0-100, confidence indicator, factors list)
│       ├── WinButton → WinConfirmationModal
│       │   └── WinConfirmationModal (actual close value, close date, notes)
│       ├── LostButton → LostReasonModal
│       │   └── LostReasonModal (reason dropdown + notes, required)
│       ├── ActivityFeed (notes, meetings, emails — read-only timeline)
│       ├── LinkedContacts (list, add/remove)
│       ├── LinkedCompanies (list, add/remove)
│       └── NotesField (textarea, auto-save on blur)
│
├── [ContactsTab]
│   ├── ContactsToolbar
│   │   ├── SearchInput (searches name, email, phone, company)
│   │   ├── FilterBar (lifecycle stage, lead score range, tags, owner)
│   │   ├── CreateContactButton → ContactFormModal
│   │   └── CSV Import Button → ImportModal (drag-drop CSV, column mapping, progress bar)
│   ├── ContactsDataTable
│   │   ├── Columns: name, email, phone, company, lifecycle_stage, lead_score, owner, last_contacted
│   │   ├── Sortable, paginated (server-side pagination at 50 rows)
│   │   └── Row click → ContactDrawer
│   └── ContactDrawer
│       ├── ContactHeader (name, avatar, lifecycle stage badge)
│       ├── ContactDetails (email, phone, company, address, social links)
│       ├── LeadScoreDisplay (score number, factors, breakdown)
│       ├── DealHistoryTable (linked deals with stage, value, status)
│       ├── ActivityTimeline
│       └── NotesField
│
├── [CompaniesTab]
│   ├── CompaniesToolbar (search, filter by industry/size/owner, create)
│   ├── CompaniesDataTable
│   │   ├── Columns: name, industry, size, revenue, owner, deal_count
│   │   └── Row click → CompanyDrawer
│   └── CompanyDrawer
│       ├── CompanyHeader (name, industry, size)
│       ├── CompanyDetails (website, phone, address, description)
│       ├── RelatedDealsTable (linked deals)
│       ├── RelatedContactsTable (linked contacts)
│       └── NotesField
│
├── [LeadsTab]
│   ├── LeadsToolbar (search, filter by status/source/score, create)
│   ├── LeadsDataTable
│   │   ├── Columns: name, email, source, status, score, owner, created_date
│   │   ├── Score column shows badge (0-25 cold, 26-50 warm, 51-75 hot, 76-100 boiling)
│   │   └── Row click → LeadDetailModal
│   └── LeadDetailModal (modal, not drawer — full focus)
│       ├── LeadInfo (name, email, phone, company, source, status)
│       ├── ScoreDisplay (current score + recalculate button → GET /api/crm/leads/{id}/score)
│       ├── AssignSection (user dropdown → POST /api/crm/leads/{id}/assign)
│       ├── ConvertToDealButton → ConvertToDealForm
│       │   └── ConvertToDealForm (map lead fields to deal fields, add pipeline/stage)
│       └── ActivityLog
│
├── [PipelineManagerTab]
│   ├── PipelineList (sidebar or tabs, create/delete/rename)
│   └── StageList (per pipeline)
│       ├── StageCard (name, position drag handle, color swatch)
│       ├── AddStageButton (appends at end)
│       └── StageEditor (rename, change color, delete)
│
└── [ReportsTab]
    └── CRMReportsContent (delegated to 09-reports-analytics.md design)
```

## Data Flow

### Deal Pipeline Kanban (Drag-and-Drop)

Same logic as Boards — reuse the `KanbanColumn` and `DraggableCard` primitives, but use the deal endpoints instead of items:

| Action | Endpoint | Notes |
|---|---|---|
| Create deal | POST /api/workspaces/{id}/crm/deals | |
| Update deal | PUT .../deals/{dealId} | |
| Move deal stage | PUT .../deals/{dealId} with changed stageId | No dedicated move endpoint — stage change is a field update |
| Won/Lost | POST /api/crm/deals/{id}/won or /lost | |
| Score | POST /api/crm/deals/{id}/score | Returns score value |

**CRITIQUE:** Unlike boards, deals have **no `move` endpoint with position/version**. This means:
- No optimistic reorder within a stage.
- No conflict detection (someone else changes the same deal = silent overwrite).
- Multi-user drag-and-drop will corrupt stage assignments.

**Fix:** Add `POST /api/crm/deals/{id}/move` with `{stage_id, position, expected_version}` mirroring the items move endpoint. Without it, the pipeline Kanban is single-user only.

### Contacts & Companies CRUD

Standard REST patterns. Cache with SWR pattern — stale-while-revalidate, refetch on window focus, throttle to once per 30s.

### CSV Import

```
Flow:
1. User uploads CSV file (drag-drop or file picker).
2. POST /api/workspaces/{id}/crm/contacts/import → returns import_id.
3. Poll GET /api/workspaces/{id}/crm/imports/{importId}/progress every 2s.
4. Display progress bar with counts: "342 / 500 processed, 12 errors".
5. On complete: toast("Import finished: 488 created, 12 errors"), show error download link.
6. On failure: toast with error message, retry button.
```

No backend endpoint is listed for import. This is missing — needs `POST .../contacts/import` and `GET .../imports/{id}/progress`.

### AI Scoring

POST /api/crm/deals/{id}/score returns a number. The UI displays it with:
- A big number (0-100).
- A confidence indicator (low/medium/high — derived from score spread? Not provided by API).
- Factor breakdown — **not provided by API either**.

**CRITIQUE: The AI Scoring Is Lipstick on a Pig.** The superprompt mentions "AI predictive scoring" with ML model integration, but the backend has a single `POST /score` that returns... what? A number? No factors, no confidence interval, no explanation, no model version, no training data. This is not predictive scoring — it's a heuristic formula at best.

**What actual predictive scoring needs:**
- `POST /api/crm/models/predict` with deal/lead features as input → `{ score, confidence, factors: [{name, impact}] }`.
- `GET /api/crm/models/{modelId}/performance` → precision/recall, ROC curve, feature importance.
- `POST /api/crm/models/train` → triggers training pipeline, returns model_id.
- Dataset export endpoint for training data.

Without these, the "AI Score" button is a magic number generator. Users will see it once, get no explanation, and never click it again. **Ship this as a basic heuristic score and call it "Lead Score" — don't market it as AI until the ML pipeline exists.**

### Socket Events

```
Namespace: workspace:{workspaceId}
Channel: crm:deals, crm:contacts, crm:leads, crm:companies

Events:
  deal_created / deal_updated / deal_moved / deal_deleted
  contact_created / contact_updated / contact_deleted
  lead_created / lead_updated / lead_deleted
  company_created / company_updated / company_deleted
```

On any event, merge into local cache. No full refetch.

## Loading / Empty / Error States

### Deals Kanban
- **Loading:** 4 skeleton columns with 3 skeleton cards each. Cards show pulsing value/title/date placeholders.
- **Empty pipeline:** "No deals in [pipeline name]. Create your first deal." + CTA button.
- **Empty stage (but other stages have deals):** Dashed outline box with "Drop deals here" text.
- **Error:** Banner "Failed to load deals. Retry." + individual column-level retry.

### Contacts/Companies Table
- **Loading:** 15 skeleton rows (5 columns, alternating pulse).
- **Empty:** "No contacts yet. Import a CSV or create one manually." Two CTA buttons.
- **Error:** Full-page error with retry.

### Leads Table
- **Loading:** 10 skeleton rows.
- **Empty:** "No leads yet. Create your first lead."
- **Error:** Banner + retry.

### Pipeline Manager
- **Loading:** Skeleton text for pipeline names, skeleton stage cards.
- **Empty (no pipelines):** "No pipelines configured. Create your first pipeline to start managing deals." + pipeline create form.
- **Error:** Banner + retry.

## Performance Considerations

| Concern | Strategy |
|---|---|
| 5,000+ contacts | Server-side pagination (50 rows). Virtual scrolling optional but not needed at that page size. |
| 500+ deals in kanban | Virtualize column cards. Collapse deals in non-focused stages. |
| CSV import (10k rows) | Chunked upload on backend. Progress polling every 2s. Don't block the UI — keep it interactive. |
| Multi-pipeline | Pipeline data is small (< 50 pipelines). Fetch all upfront, switch client-side. |
| Reports | Lazy-load report tabs. Each report is its own data fetch when tab activated. |

## Accessibility

- Kanban drag-and-drop: Arrow keys + Space to pick up/place cards. Announce drop zone on focus.
- Modals trap focus, close on Escape.
- Data tables: proper `<th>`, `scope`, sort indicators with `aria-sort`.
- Sort buttons announce "sorted ascending/descending" via aria-live.
- CSV import progress is `role="progressbar"` with `aria-valuenow`.

## CRITIQUE: Missing Features & Risks

1. **No contact merge endpoint.** Real CRMs need deduplication. Without `POST /api/crm/contacts/merge`, duplicate contacts will pile up. Users will complain.

2. **No email integration.** CRM without email sync is a spreadsheet. No Gmail/Outlook integration endpoints exist. This is a critical gap for any sales team.

3. **No activity logging on the backend.** The deal drawer shows an "activity feed" and "activity timeline" but there's no `GET /api/crm/deals/{id}/activities` endpoint. Without it, those sections are static UI.

4. **No notes endpoint.** Notes are listed in every drawer but there's no PUT/POST for notes. Are notes part of the deal/contact/company PUT body? That conflates data — notes change frequently and shouldn't trigger version bumps on the parent entity.

5. **Deal win/loss reasons need a backend schema.** The lost reason modal sends `POST /api/crm/deals/{id}/lost` but there's no documented schema for the body. Define `{ reason: string, notes: string }` and store it on the deal.

6. **AI score endpoint returns a number with zero explainability.** Without factors or confidence, the score is meaningless. See detailed callout above in AI Scoring section.

7. **CRITICAL: No search endpoint.** Contacts/Companies/Leads tables all need search but there's no `?q=` query param documented on any GET endpoint. Full-text search must be supported server-side or you're fetching every row and filtering client-side — which breaks at 1k+ records.

---
ticket: PROD-VISITOR-DESIGN-001
author: designer
status: published
date: 2026-06-08
related: PROD-VISITOR-001 (builder will implement)
---

# VISITOR-MGMT-DESIGN-001 — Visitor Management: Gate Kiosk Extension

## Problem Summary

The gate kiosk (`GateKiosk.tsx`) currently handles workers only — it validates compliance via badge scan and shows a red/green result. Visitors (DMR inspectors, suppliers, job applicants, guests) are still using a paper logbook, which contradicts the "digital gate" narrative during demos. DMR inspector visits specifically need digital tracking for audit trail.

## Design Principles

| # | Principle | Rationale |
|---|---|---|
| 1 | **Mode switch, not separate page** — Visitor flow lives as a tab within the existing kiosk screen | Avoids navigation complexity; kiosk is a dedicated device that never leaves this view |
| 2 | **<30s sign-in** — Maximum 4 taps (type → form → confirm → done) | Kiosk is a high-throughput gate; visitors queue |
| 3 | **Reuse existing components** — No new design tokens; use `Card`, `Button`, `Input`, `Select`, `Tabs`, `Modal` | Consistent with existing app, zero new CSS |
| 4 | **No compliance check** — Identity + host + time tracking only | Visitors don't have COF/certs/induction in the system |
| 5 | **Host notification on sign-in** — SMS via existing `SendNotification` job | The requirement calls for SMS; infrastructure already exists |
| 6 | **Badge is printable** — Name, host, date, time-in on a kiosk-label format | DMR inspectors expect a physical badge |

---

## 1. User Flow Diagram (Text-Based)

```
                    ┌─────────────────────────────────────────┐
                    │         GATE KIOSK MAIN SCREEN           │
                    │  ┌──────────┐  ┌──────────┐             │
                    │  │ Worker   │  │ Visitor  │  ← TAB BAR  │
                    │  │ Scan     │  │          │             │
                    │  └──────────┘  └──────────┘             │
                    └─────────────────────────────────────────┘
                                    │
                      User taps "Visitor" tab
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │  STEP 1: SELECT VISITOR TYPE             │
                    │  ┌────────────────────────────────────┐  │
                    │  │ [Supplier] [Inspector] [Guest]     │  │
                    │  │ [Job Applicant]                    │  │
                    │  │                                    │  │
                    │  │ [Continue →]                       │  │
                    │  └────────────────────────────────────┘  │
                    └─────────────────────────────────────────┘
                                    │
                        User selects a type and taps Continue
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │  STEP 2: VISITOR DETAILS (form)         │
                    │  ┌────────────────────────────────────┐  │
                    │  │ Full Name *                        │  │
                    │  │ Company *                          │  │
                    │  │ ID Number / Passport               │  │
                    │  │ Vehicle Registration                │  │
                    │  │ Host Name *                        │  │
                    │  │ Purpose of Visit *                 │  │
                    │  │                                    │  │
                    │  │ [Back] [Sign In →]                 │  │
                    │  └────────────────────────────────────┘  │
                    └─────────────────────────────────────────┘
                                    │
                      User fills form, taps Sign In
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │  STEP 3: CONFIRM & NOTIFY               │
                    │  ┌────────────────────────────────────┐  │
                    │  │ Type: Supplier                     │  │
                    │  │ Name: John Smith                   │  │
                    │  │ Company: RBC Mining                 │  │
                    │  │ Host: Thabo Mokoena                │  │
                    │  │ Purpose: Equipment inspection      │  │
                    │  │ Time: 08 Jun 2026 09:15            │  │
                    │  │                                    │  │
                    │  │ [ ] Notify host via SMS            │  │
                    │  │                                    │  │
                    │  │ [Edit] [Confirm & Sign In]         │  │
                    │  └────────────────────────────────────┘  │
                    └─────────────────────────────────────────┘
                                    │
                      User taps Confirm & Sign In  → API call
                                    │
                    ┌─────────────────────────────────────────┐
                    │  STEP 4: SIGNED IN ✓                    │
                    │  ┌────────────────────────────────────┐  │
                    │  │  ✅ SIGNED IN                      │  │
                    │  │                                    │  │
                    │  │  ┌────────────────────────────┐    │  │
                    │  │  │       [BADGE PREVIEW]       │    │  │
                    │  │  │  Aquerii Site Access        │    │  │
                    │  │  │  John Smith                 │    │  │
                    │  │  │  RBC Mining                 │    │  │
                    │  │  │  Host: Thabo                │    │  │
                    │  │  │  08 Jun 2026  09:15 AM      │    │  │
                    │  │  └────────────────────────────┘    │  │
                    │  │                                    │  │
                    │  │ [🖨 Print Badge] [Sign In Next]    │  │
                    │  └────────────────────────────────────┘  │
                    └─────────────────────────────────────────┘
                                    │
                  Sign Out flow (from Visitor tab main state):
                                    │
                    ┌─────────────────────────────────────────┐
                    │  VISITOR TAB (when visitor signed in)   │
                    │  ┌────────────────────────────────────┐  │
                    │  │  Currently signed in:              │  │
                    │  │  John Smith — RBC Mining           │  │
                    │  │  Signed in at: 09:15 AM            │  │
                    │  │                                    │  │
                    │  │ [🔴 Sign Out]                     │  │
                    │  └────────────────────────────────────┘  │
                    └─────────────────────────────────────────┘
                                    │
                      User taps Sign Out → confirmation
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │  SIGN OUT CONFIRMATION                  │
                    │  ┌────────────────────────────────────┐  │
                    │  │ Sign out John Smith?               │  │
                    │  │ Signed in: 09:15 AM (2h 10m)       │  │
                    │  │                                    │  │
                    │  │ [Cancel] [Sign Out]                │  │
                    │  └────────────────────────────────────┘  │
                    └─────────────────────────────────────────┘
                                    │
                       On success → back to step 1 selector
```

---

## 2. Screen Descriptions

### 2.1 — Mode Switch (GateKiosk.tsx modification)

**Current state:** `GateKiosk.tsx` has a single mode (worker badge scan). We add a tab bar at the top.

**Layout change** — Insert above the existing worker scan content:

```
┌────────────────────────────────────────────────────────────────┐
│ [Shield icon]  Site Access Gate                                │
│                 Digital gate compliance & visitor management    │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐                             │
│ │  Worker Scan  │  │  Visitor     │  ← <Tabs> with 2 tabs     │
│ └──────────────┘  └──────────────┘                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  (TabPanel renders either existing scan UI or visitor flow)    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

- Use `<Tabs defaultValue="worker">` wrapping the existing content in a `TabPanel value="worker"` and the new visitor flow in `TabPanel value="visitor"`
- Each tab has a `User` icon for visitor, `ScanLine` icon for worker
- The tab bar replaces the current header's `Scan worker badge to verify compliance` subtitle with a contextual subtitle based on active tab
- Tab labels: `Tab value="worker"` → "Worker Scan", `Tab value="visitor"` → "Visitor"

### 2.2 — Step 1: Visitor Type Selector

**State:** idle (not yet signed in, no active visitor)

**Layout** — Full-screen card, centered, same dimensions as the existing scan card (`max-w-lg`):

```
┌──────────────────────────────────────────────┐
│  [User icon in accent circle]                 │
│  Select Visitor Type                          │
│  Choose the category that best describes      │
│  your visit                                   │
│                                              │
│  ┌──────────────┐  ┌──────────────┐          │
│  │  🚚          │  │  📋          │          │
│  │  Supplier    │  │  Inspector   │          │
│  │              │  │              │          │
│  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐          │
│  │  👤          │  │  💼          │          │
│  │  Guest       │  │  Job         │          │
│  │              │  │  Applicant   │          │
│  └──────────────┘  └──────────────┘          │
│                                              │
│  [Continue →] (disabled until selected)      │
└──────────────────────────────────────────────┘
```

**Component: `VisitorTypeSelector`** (new, in `src/pages/gate/`)

- 4 option cards in a 2×2 grid: `grid grid-cols-2 gap-3`
- Each card: `Card variant="interactive" padding="md"`, selected state has `border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]`
- Icon chip inside each card (mining-context emoji temporarily, replace with lucide icons once designer approves):
  - Supplier → `Truck` icon
  - Inspector (DMR) → `ClipboardCheck` icon
  - Guest → `User` icon
  - Job Applicant → `Briefcase` icon
- On click: card gets selected style, Continue button enables
- Continue button: `<Button variant="primary" size="lg" fullWidth disabled={!selected}>`

### 2.3 — Step 2: Visitor Details Form

**State:** filling form

**Layout** — Same card, replaces the type selector:

```
┌──────────────────────────────────────────────┐
│  [← Back]  Visitor Details   Step 2 of 3     │  ← Back button + step indicator
├──────────────────────────────────────────────┤
│                                              │
│  Full Name *                                 │
│  ┌──────────────────────────────────────────┐│
│  │  e.g. John Smith                         ││
│  └──────────────────────────────────────────┘│
│                                              │
│  Company *                                   │
│  ┌──────────────────────────────────────────┐│
│  │  e.g. RBC Mining                         ││
│  └──────────────────────────────────────────┘│
│                                              │
│  ID Number / Passport                        │
│  ┌──────────────────────────────────────────┐│
│  │  e.g. 850101 5800 089 or PA123456        ││
│  └──────────────────────────────────────────┘│
│                                              │
│  Vehicle Registration                         │
│  ┌──────────────────────────────────────────┐│
│  │  e.g. CF 123-456 GP                      ││
│  └──────────────────────────────────────────┘│
│                                              │
│  Host Name *                                 │
│  ┌──────────────────────────────────────────┐│
│  │  e.g. Thabo Mokoena                     ││
│  └──────────────────────────────────────────┘│
│                                              │
│  Purpose of Visit *                          │
│  ┌──────────────────────────────────────────┐│
│  │  e.g. Equipment inspection / delivery   ││
│  └──────────────────────────────────────────┘│
│                                              │
│  [Back]              [Sign In →]             │
└──────────────────────────────────────────────┘
```

**Component: `VisitorForm`** (new, in `src/pages/gate/`)

- Uses existing `<Input>` with `size="lg"` for kiosk touch targets
- Required fields marked with `*`
- Validation on submit:
  - `name`: required, min 2 chars
  - `company`: required, min 2 chars
  - `id_number`: optional, but if provided must be at least 4 chars (passport/ID)
  - `vehicle_registration`: optional, free text
  - `host_name`: required, min 2 chars
  - `purpose`: required, min 10 chars (to prevent "visit" as purpose)
- Each field error shows inline using `<Input error="..." />`
- Step indicator: "Step 2 of 3" as small text above the form
- Back button returns to Step 1 (preserves selected type)

### 2.4 — Step 3: Review & Confirm

**State:** confirming

```
┌──────────────────────────────────────────────┐
│  [← Edit]  Review & Confirm  Step 3 of 3     │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐│
│  │  Type         Supplier                   ││
│  │  Name         John Smith                 ││
│  │  Company      RBC Mining                 ││
│  │  ID Number    850101 5800 089            ││
│  │  Vehicle      CF 123-456 GP              ││
│  │  Host         Thabo Mokoena              ││
│  │  Purpose      Equipment inspection       ││
│  │  Time         Mon, 08 Jun 2026 09:15     ││
│  └──────────────────────────────────────────┘│
│                                              │
│  ┌─ [x] Notify host via SMS ───────────────┐│
│  │  Send an SMS to the host notifying them  ││
│  │  that their visitor has arrived.         ││
│  └──────────────────────────────────────────┘│
│                                              │
│  [Edit]          [Confirm & Sign In]         │
└──────────────────────────────────────────────┘
```

**Properties:**
- Summary is a `<Card variant="default" padding="sm">` with key-value rows: label on left, value on right using `flex justify-between` within each row
- "Notify host via SMS" is a `<Checkbox>` component, default checked (`true`)
- Edit button returns to Step 2 (preserves all entered data)
- Confirm & Sign In triggers `POST /workspaces/{wid}/gate/visitor/sign-in`
- Button shows loading spinner while request is in flight

### 2.5 — Step 4: Success / Badge

**State:** signed in successfully

```
┌──────────────────────────────────────────────┐
│  ✅  SIGNED IN                                │
│  Visitor access granted                       │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │        AQUERII SITE ACCESS                ││
│  │          VISITOR BADGE                    ││
│  │                                          ││
│  │    ┌─────────────────────────┐           ││
│  │    │  [Aquerii logo / icon]  │           ││
│  │    │                         │           ││
│  │    │  John Smith             │           ││
│  │    │  RBC Mining             │           ││
│  │    │  Supplier               │           ││
│  │    │  Host: Thabo Mokoena    │           ││
│  │    │  08 Jun 2026  09:15 AM  │           ││
│  │    └─────────────────────────┘           ││
│  │                                          ││
│  │  ┌──────────────────────────────────┐    ││
│  │  │  🖨  Print Badge                │    ││
│  │  └──────────────────────────────────┘    ││
│  └──────────────────────────────────────────┘│
│                                              │
│  [Sign In Next Visitor]                       │
└──────────────────────────────────────────────┘
```

**Component: `VisitorSuccess`** (new/presentational)

- Large green success indicator (`CheckCircle` icon, 56px, `text-emerald-400`)
- Badge preview in a bordered container styled to resemble a physical badge
- Badge content: Aquerii branding, visitor name (large), company, type, host, date/time
- "Print Badge" button triggers `window.print()` via a printable section or opens a small label template
- "Sign In Next Visitor" resets all state back to Step 1

**Print behavior:**
- The badge area should be wrapped in a `@media print`-visible container
- Print hides all buttons, the tab bar, and the surrounding kiosk chrome
- Badge prints at ~90mm × 55mm (standard label size) centered on the page
- Print CSS can be inline or use the existing `print.css` pattern

### 2.6 — Sign-Out Flow

**State:** visitor is currently signed in (no visitor sign-in in progress)

This state is visible on the Visitor tab when there is an active (unclosed) visitor log for this kiosk:

```
┌──────────────────────────────────────────────┐
│  👤  Currently Signed In                      │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │  Name:     John Smith                    ││
│  │  Company:  RBC Mining                    ││
│  │  Type:     Supplier                      ││
│  │  Host:     Thabo Mokoena                 ││
│  │  Signed in:  09:15 AM                    ││
│  │  Duration:   2h 10m                      ││
│  └──────────────────────────────────────────┘│
│                                              │
│  [🔴 Sign Out]                               │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │  Or sign in a new visitor:               ││
│  │  [Sign In New Visitor →]                 ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

Tapping "Sign Out" opens a confirmation modal:

```
┌── Sign Out Visitor? ──────────────────────┐
│                                            │
│  Sign out John Smith from RBC Mining?      │
│  Signed in at 09:15 AM (2h 10m ago)        │
│                                            │
│  This will record the departure time.      │
│                                            │
│        [Cancel]    [Sign Out]              │
└────────────────────────────────────────────┘
```

Confirming calls `POST /workspaces/{wid}/gate/visitor/{logId}/sign-out` and resets the flow to Step 1.

---

## 3. State Matrix

### Visitor Tab — All States

| State | What Shows | Trigger | Duration |
|-------|-----------|---------|----------|
| **Loading** | Skeleton card: 4 pulsing placeholder rectangles simulating the type selector grid | Initial load or kiosk is fetching active visitor status | Until API responds |
| **Idle** | Step 1 — Visitor type selector | No active visitor, no sign-in in progress | Until user selects type |
| **Form** | Step 2 — Visitor details form | User selected a type and tapped Continue | Until user submits or goes back |
| **Review** | Step 3 — Review & confirm | User filled form and tapped Sign In | Until user confirms or edits |
| **Submitting** | Confirm button shows spinner, form inputs frozen | User tapped Confirm & Sign In | Until API responds |
| **Success** | Step 4 — Badge with print option | API returned 201 | Until user taps "Sign In Next" |
| **Error** | Inline error toast or error banner on current step | API returned 4xx/5xx or network failed | Until user dismisses or retries |
| **Active Visitor** | Currently signed-in card with sign-out button | A visitor is signed in (API returns active visitor on tab mount) | Until user signs out |
| **Signing Out** | Modal loading spinner | User confirmed sign-out | Until API responds |

### Error states detail

| Error Scenario | Where Shown | Message | Recovery |
|---------------|-------------|---------|----------|
| Network failure (timeout) | Toast (existing `toast.error`) | "Network error. Please check connection and try again." | User taps Confirm again |
| Validation error from server | Inline on the form field | Server message attached to the specific field | User corrects field and resubmits |
| Server 500 | Toast | "Something went wrong. Please try again or contact security." | User taps Confirm again |
| Duplicate sign-in (already active) | Modal | "This visitor is already signed in. Please sign them out first." | Resets to Active Visitor state |
| Host SMS failure | Non-blocking toast | "Visitor signed in. SMS notification failed to send." | Logged server-side; no user action needed |

### Empty states

| Scenario | UI |
|----------|----|
| No visitor types available (theoretical) | Not applicable — types are hardcoded |
| No active visitor (idle) | Step 1 type selector (this IS the empty state) |
| No visitors in log (this tab doesn't show logs; that's a separate admin view) | N/A |

---

## 4. Data Model Recommendation

### New Table: `visitor_logs`

```sql
CREATE TABLE visitor_logs (
    id              UUID PRIMARY KEY,
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    kiosk_id        UUID REFERENCES gate_kiosks(id),

    -- Identity
    visitor_type    VARCHAR(20) NOT NULL CHECK (visitor_type IN (
                        'supplier', 'inspector', 'guest', 'job_applicant'
                    )),
    full_name       VARCHAR(255) NOT NULL,
    company         VARCHAR(255) NOT NULL,
    id_number       VARCHAR(100) NULL,
    vehicle_reg     VARCHAR(50) NULL,

    -- Host
    host_name       VARCHAR(255) NOT NULL,
    host_user_id    UUID NULL REFERENCES users(id),  -- resolved at sign-in time if match found
    host_notified   BOOLEAN NOT NULL DEFAULT FALSE,
    host_notified_at TIMESTAMPTZ NULL,

    -- Purpose
    purpose         TEXT NOT NULL,

    -- Timing
    signed_in_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signed_out_at   TIMESTAMPTZ NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
                        CASE WHEN signed_out_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (signed_out_at - signed_in_at)) / 60
                            ELSE NULL
                        END
                    ) STORED,

    -- Badge
    badge_printed   BOOLEAN NOT NULL DEFAULT FALSE,
    badge_printed_at TIMESTAMPTZ NULL,

    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Soft delete for audit
    deleted_at      TIMESTAMPTZ NULL
);
```

**Indexes:**
- `(workspace_id, signed_in_at DESC)` — dashboard/report queries
- `(workspace_id, signed_out_at)` — find active visitors (WHERE signed_out_at IS NULL)
- `(kiosk_id, signed_out_at)` — current kiosk active visitor lookup

### API Endpoints

| Method | Path | Purpose | Request Body | Response |
|--------|------|---------|-------------|----------|
| `GET` | `/workspaces/{wid}/gate/visitor/active` | Get currently active visitor for this kiosk | — | `{ data: VisitorLog \| null }` |
| `POST` | `/workspaces/{wid}/gate/visitor/sign-in` | Sign in a visitor | `{ kiosk_id, visitor_type, full_name, company, id_number?, vehicle_reg?, host_name, host_user_id?, purpose, notify_host: bool }` | `{ data: VisitorLog }` (201) |
| `PATCH` | `/workspaces/{wid}/gate/visitor/{id}/sign-out` | Sign out a visitor | — | `{ data: VisitorLog }` |
| `PATCH` | `/workspaces/{wid}/gate/visitor/{id}/badge-printed` | Mark badge as printed | — | `{ data: VisitorLog }` |
| `GET` | `/workspaces/{wid}/gate/visitor/logs` | Visitor log (for admin/reports) | Query: `?date_from=&date_to=&type=` | Paginated list |

### New Model: `VisitorLog` (Eloquent)

```php
class VisitorLog extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'workspace_id', 'kiosk_id',
        'visitor_type', 'full_name', 'company', 'id_number', 'vehicle_reg',
        'host_name', 'host_user_id', 'host_notified', 'host_notified_at',
        'purpose', 'signed_in_at', 'signed_out_at',
        'badge_printed', 'badge_printed_at',
    ];

    protected function casts(): array
    {
        return [
            'signed_in_at' => 'datetime',
            'signed_out_at' => 'datetime',
            'host_notified_at' => 'datetime',
            'badge_printed_at' => 'datetime',
            'host_notified' => 'boolean',
            'badge_printed' => 'boolean',
        ];
    }

    public function workspace(): BelongsTo { ... }
    public function kiosk(): BelongsTo { ... }
    public function hostUser(): BelongsTo { ... }
}
```

### Frontend Types (in `src/lib/visitor.ts`)

```typescript
export type VisitorType = 'supplier' | 'inspector' | 'guest' | 'job_applicant'

export interface VisitorSignInRequest {
  kiosk_id: string
  visitor_type: VisitorType
  full_name: string
  company: string
  id_number?: string
  vehicle_reg?: string
  host_name: string
  host_user_id?: string
  purpose: string
  notify_host: boolean
}

export interface VisitorLog {
  id: string
  workspace_id: string
  kiosk_id: string | null
  visitor_type: VisitorType
  full_name: string
  company: string
  id_number: string | null
  vehicle_reg: string | null
  host_name: string
  host_user_id: string | null
  host_notified: boolean
  host_notified_at: string | null
  purpose: string
  signed_in_at: string
  signed_out_at: string | null
  duration_minutes: number | null
  badge_printed: boolean
  badge_printed_at: string | null
}
```

### API Hooks (in `src/lib/visitor.ts`)

```typescript
export function useActiveVisitor(kioskId: string) { /* GET query */ }
export function useSignInVisitor() { /* POST mutation */ }
export function useSignOutVisitor() { /* PATCH mutation */ }
export function useMarkBadgePrinted() { /* PATCH mutation */ }
```

### SMS Notification

On sign-in, if `notify_host: true`, the backend dispatches a notification:

```php
// In GateController::visitorSignIn():
if ($validated['notify_host'] && $hostUser) {
    $hostUser->notify(new VisitorArrivedNotification(
        visitorName: $validated['full_name'],
        visitorCompany: $validated['company'],
        visitorType: $validated['visitor_type'],
        signedInAt: now(),
    ));
}
```

We create `App\Notifications\VisitorArrivedNotification` — pattern identical to `CertExpiryNotification`:

- Channels: `['sms']` (SMS only, no email needed per requirement)
- `toSms()` returns: `[Aquerii] VISITOR ARRIVED: John Smith (RBC Mining, Supplier) has arrived for Thabo Mokoena at 09:15 AM.`
- If `host_user_id` is null but `host_name` is provided, we attempt to fuzzy-match a user, or log the notification intent without sending

---

## 5. New Components Needed

### `src/pages/gate/VisitorTypeSelector.tsx`
- Props: `{ selected: VisitorType | null; onSelect: (type: VisitorType) => void }`
- Renders the 2×2 grid with 4 type cards
- No network calls

### `src/pages/gate/VisitorForm.tsx`  
- Props: `{ data: VisitorFormData; onChange: (data: VisitorFormData) => void; errors: Record<string, string>; onBack: () => void; onSubmit: () => void }`
- Renders all 6 form fields using `<Input label="..." size="lg" error={...} />`
- No internal state — fully controlled from parent
- Calls `onSubmit` on Enter keydown on the last field

### `src/pages/gate/VisitorReview.tsx`
- Props: `{ data: VisitorFormData; type: VisitorType; notifyHost: boolean; onNotifyChange: (v: boolean) => void; onEdit: () => void; onConfirm: () => void; loading: boolean }`
- Renders review summary card + checkbox + action buttons

### `src/pages/gate/VisitorSuccess.tsx`
- Props: `{ log: VisitorLog; onPrint: () => void; onReset: () => void }`
- Renders success badge, print button, reset button

### `src/pages/gate/VisitorActiveCard.tsx`
- Props: `{ log: VisitorLog; onSignOut: () => void; onNewVisitor: () => void }`
- Renders the "currently signed in" card with sign-out button

### `src/lib/visitor.ts`
- API client: `useActiveVisitor`, `useSignInVisitor`, `useSignOutVisitor`, `useMarkBadgePrinted`
- Types: `VisitorType`, `VisitorSignInRequest`, `VisitorLog`

### `App\Notifications\VisitorArrivedNotification.php`
- SMS notification for host
- Channels: `['sms']`
- `toSms(): string` — formatted message per spec above

### `app/Models/VisitorLog.php`
- Eloquent model with fillable, casts, relationships

### Migration: `create_visitor_logs_table`
- Creates the `visitor_logs` table with all columns and indexes

### `GateController` additions
- `visitorActive(Request, workspaceId)` — returns active visitor or null
- `visitorSignIn(Request, workspaceId)` — validates + creates + optionally notifies
- `visitorSignOut(Request, workspaceId, logId)` — sets `signed_out_at = now()`
- `visitorMarkBadgePrinted(Request, workspaceId, logId)` — sets `badge_printed = true`

### No new design tokens / CSS variables
All components use existing `var(--color-*)` tokens and existing `Card`, `Button`, `Input`, `Select`, `Checkbox`, `Tabs`, `Modal` components.

---

## 6. Mobile / Responsive Considerations

### Kiosk is full-screen tablet (primary target)
The kiosk view is designed for a fixed tablet in landscape orientation. The existing `GateKiosk.tsx` already uses `min-h-screen bg-black` and centered layout.

### Tablet portrait
- Type selector remains 2×2 (works fine)
- Form fields stack vertically (already single-column)
- Card max-width `max-w-lg` keeps everything readable

### Phone (mobile gate supervisor view)
If the kiosk tab is ever accessed from a phone:
- Type selector should collapse to a `<Select>` dropdown (or keep 2×2 but shrink to `gap-2`)
- Form fields: `<Input size="md">` instead of `size="lg"` to save vertical space
- Step indicator: remove "Step X of Y" text, keep just the back arrow
- Badge preview: reduce font sizes proportionally
- Sign-out active card: stack vertically instead of horizontal

These responsive adjustments can be handled by existing Tailwind breakpoints (`sm:`, `md:`) — no separate mobile layout required for v1. The kiosk is primarily tablet.

### Print
- Badge print uses `@media print` CSS to hide everything except the badge
- Print format: 90mm × 55mm label (standard badge size)
- Use the existing `print.css` pattern found in `src/components/ui/print.css`

---

## 7. Multi-Step State Management

### `GateKiosk.tsx` — Visitor flow state machine

```typescript
type VisitorStep = 'idle' | 'form' | 'review' | 'success'

interface VisitorState {
  step: VisitorStep
  type: VisitorType | null
  formData: VisitorFormData
  notifyHost: boolean
  activeLog: VisitorLog | null  // set when there's an active sign-in
  errors: Record<string, string>
  submitting: boolean
}
```

**Transitions:**

```
IDLE ──(select type + Continue)──> FORM
FORM ──(Back)──> IDLE
FORM ──(submit)──> REVIEW
REVIEW ──(Edit)──> FORM
REVIEW ──(Confirm + API success)──> SUCCESS
SUCCESS ──(Sign In Next)──> IDLE
ANY ──(API error)──> CURRENT step (toast/error)
ANY ──(mount, active log found)──> ACTIVE VIEW
ACTIVE ──(Sign Out + API success)──> IDLE
ACTIVE ──(Sign In New)──> IDLE (but show warning if already active)
```

### Flow parent (`GateKiosk.tsx`)

The visitor flow lives in a `TabPanel value="visitor"` inside the existing `GateKiosk.tsx`. It replaces the scan Card when the visitor tab is active.

```tsx
// Inside GateKiosk.tsx, augment existing return:
<Tabs defaultValue="worker" onValueChange={handleTabChange}>
  <TabList className="justify-center mb-6">
    <Tab value="worker" icon={ScanLine}>Worker Scan</Tab>
    <Tab value="visitor" icon={User}>Visitor</Tab>
  </TabList>

  <TabPanel value="worker">
    {/* existing scan flow — unchanged */}
  </TabPanel>

  <TabPanel value="visitor">
    <VisitorFlow kioskId={kioskId} />
  </TabPanel>
</Tabs>
```

`<VisitorFlow>` is a new component in `src/pages/gate/VisitorFlow.tsx` that encapsulates the entire visitor state machine and renders the appropriate step.

---

## 8. Acceptance Criteria (for builder)

1. **Tab switch**: GateKiosk has a two-tab mode switch ("Worker Scan" | "Visitor"). Switching tabs resets visitor flow but preserves worker scan state. Switching to Worker Scan while a visitor is signing in does NOT sign them out.
2. **Type selector**: 4 visitor types render in a 2×2 grid. Selection highlights the card. Continue is disabled until one is selected.
3. **Form**: All 6 fields render (name, company, ID, vehicle, host, purpose). Required fields show `*`. Inline validation shows errors below fields on submit attempt. Back button preserves form data.
4. **Review**: Summary shows all entered data. "Notify host via SMS" checkbox defaults to on. Edit returns to form with data intact.
5. **Sign-in API**: POST creates a visitor_log row, returns the log. On success, badge screen appears.
6. **Badge print**: Badge preview shows name, company, type, host, date/time. Print button triggers label-sized print.
7. **Active visitor**: When a visitor is signed in (no sign-out), the Visitor tab shows the active card with sign-out button. Loading this tab calls `GET .../visitor/active`.
8. **Sign-out**: Confirmation modal, then PATCH sets `signed_out_at`. After success, returns to type selector.
9. **Host notification**: If checkbox was on, SMS is sent. Failure to send SMS does NOT block sign-in (fire-and-forget).
10. **Errors**: All error states (network failure, validation, server error) show appropriate messages. See state matrix above.
11. **Loading states**: Every API call shows a loading indicator (spinner on button, skeleton on initial load).
12. **Print CSS**: Badge prints cleanly at label size. Buttons and tab bar hidden during print.
13. **No CSS regressions**: No hardcoded color values. All use `var(--color-*)` tokens.
14. **Build passes**: `tsc --noEmit` and `vite build` exit 0.

---

## 9. Implementation Order

| Step | What | Files |
|------|------|-------|
| 1 | Migration: `create_visitor_logs_table` | `database/migrations/xxxx_create_visitor_logs_table.php` |
| 2 | Model: `VisitorLog` | `app/Models/VisitorLog.php` |
| 3 | Notification: `VisitorArrivedNotification` | `app/Notifications/VisitorArrivedNotification.php` |
| 4 | Controller methods in `GateController` | `app/Http/Controllers/Api/GateController.php` |
| 5 | Routes | `routes/api.php` |
| 6 | Frontend types + API hooks: `src/lib/visitor.ts` | `src/lib/visitor.ts` |
| 7 | Components: `VisitorTypeSelector`, `VisitorForm`, `VisitorReview`, `VisitorSuccess`, `VisitorActiveCard` | `src/pages/gate/*.tsx` |
| 8 | Flow container: `VisitorFlow.tsx` | `src/pages/gate/VisitorFlow.tsx` |
| 9 | Modify `GateKiosk.tsx`: add tabs, integrate `VisitorFlow` | `src/pages/gate/GateKiosk.tsx` |
| 10 | Print CSS for badge | `src/components/ui/print.css` (augment) |
| 11 | Tests | `tests/Feature/Gate/VisitorLogTest.php`, `tests/e2e/visitor.spec.ts` |

---

## 10. Open Questions / Issues for Leader Decision

1. **Host resolution**: When the user types a host name, should we try to resolve it to a `host_user_id` via fuzzy search against the workspace members list? If yes, the form could have an autocomplete field. **Recommendation:** v1 uses free-text `host_name` only. `host_user_id` is nullable and resolved later by an admin or via a separate matching job.

2. **Badge printer hardware**: Does the kiosk have a thermal label printer (e.g., Zebra) or a standard A4 printer? The print CSS can target either, but we need to decide. **Recommendation:** Ship with `window.print()` targeting a standard label sheet (90×55mm). Thermal printer integration is a separate ticket.

3. **Multiple active visitors per kiosk**: Can two visitors sign in at the same gate without signing out? (For example, a group arrives.) **Recommendation:** v1 allows only one active visitor per kiosk at a time. If a new visitor signs in while another is active, sign out the first automatically with an audit note. Group sign-in is a v2 feature.

4. **Kiosk identification**: The `kiosk_id` in the request — is this passed from the kiosk config (hardcoded per tablet) or provided by the auth middleware? **Recommendation:** Read from the authenticated kiosk's `GateKiosk` record (already available via the `gate-kiosk` auth guard). The `kiosk_id` is inferred, not passed by the user.

5. **Data retention**: How long do visitor logs need to be retained? DMR regulations may require 3+ years. **Recommendation:** Use the existing `SoftDeletes` trait; hard-delete is never triggered automatically. Admin UI can set retention policies.

6. **Language**: All copy is in South African ZAR English. Should host SMS be localized? **Recommendation:** v1 in English only. Localization is a separate initiative.

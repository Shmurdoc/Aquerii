---
ticket: PROD-PTW-FRONTEND-001
priority: high
est_hours: 6
state: assigned
---

# designer — PTW Frontend UI Components

## Objective
Build the PTW (Permit to Work) frontend UI components: permit wizard, approval queue, permit register view, and DMR export interface.

## Acceptance Criteria
1. **Permit Creation Wizard** — multi-step form:
   - Step 1: Permit type + location (shaft, level, section)
   - Step 2: Work description (minimum 100 chars enforced), hazards identified, controls applied
   - Step 3: Worker assignment (select from compliance-filtered list)
   - Step 4: Review + submit (server-side validation blocks non-compliant workers)
   - Real-time inline validation on each step
   - Cannot advance without filling required fields
2. **Approval Queue** — for HSSE leads:
   - List of submitted permits awaiting review
   - Detail view with all permit data, hazard/control mapping, assigned workers
   - Approve/Reject buttons with reason field for rejections
   - Escalation badge (if pending > 4 hours)
3. **Permit Register** — sortable/filterable list:
   - Filter by: permit type, date range, status, contractor
   - Sort by: date, status, type
   - Export button (PDF + Excel) — use existing ExportButton component
4. **Compliance Dashboard** — frontend for the compliance engine:
   - Company-wide compliance summary (green/amber/red donut or bar)
   - Worker list with compliance status badges
   - Click to see detailed compliance breakdown per worker
   - Expiry calendar showing upcoming expirations
5. **Gate Scan Kiosk UI** — simple kiosk mode:
   - Worker ID/QR input field
   - Green/Red result display with worker photo
   - Details of non-compliance (expired certs, missing docs)

## Context Files
- C:\Users\madoc\source\repos\Aquerii\services\web\src\pages\ (directory)
- C:\Users\madoc\source\repos\Aquerii\services\web\src\components\ (directory)
- C:\Users\madoc\source\repos\Aquerii\services\web\src\lib\ (directory)
- C:\Users\madoc\source\repos\Aquerii\ALIGNED-PLAN.md

## Quality Gates
- `npm run build` passes
- All new components follow existing design patterns
- No hardcoded grays (use CSS variables)
- Components are responsive (mobile-friendly)

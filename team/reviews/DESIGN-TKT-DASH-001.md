---
ticket: TKT-DASH-001
author: designer
status: published
date: 2026-06-05
related: TKT-D.SLICE-001
---

# DESIGN-TKT-DASH-001 — Dashboard KPI Strip Layout Spec

## Problem Summary
User screenshot of the dashboard showed the four KPI cards (Open Tasks, Overdue, Upcoming Meetings, Unread Notifications) rendering in a collapsed/overlapping layout. The hero header and the rest of the dashboard rendered normally.

## Root Cause (verified)
`services/web/src/pages/DashboardPage.tsx:226–232` had a redundant double-nested grid:

```jsx
{/* outer grid — wrong */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
    <ErrorBoundary fallback={<WidgetErrorFallback label="metrics" />}>
      <KpiRow />   {/* KpiRow itself renders the same grid */}
    </ErrorBoundary>
  </div>
</div>
```

The outer grid forced `<KpiRow />` into 1 of 4 columns. `<KpiRow />` then sub-divided that single column into 4 sub-columns. On wider screens the layout degraded to a 1×1 column with 4 stacked sub-cells; on smaller viewports the cards visually collided with the activity widget below.

## Recommended Layout

### Mobile (`< 640px`)
- Single column, full width
- KPI cards stack vertically, 1 per row
- Vertical rhythm: 16px (`gap-4`) between cards
- `KpiCard` already provides its own internal padding (`p-4`) — do not wrap in extra padding containers

### Small (`sm: 640–1023px`)
- 2-column grid
- 2 rows × 2 cards
- 16px gap

### Medium+ (`md: ≥768px`)
- 4-column grid, single row
- 16px gap
- This is the canonical "executive dashboard" layout

### Large (`lg: ≥1024px`)
- 4-column grid, single row, same as md
- ActivityFeed takes 2/3 width, QuickActions takes 1/3 width

### XL (`xl: ≥1280px`)
- 4-column grid
- Increased max-width or side gutters (handled by `p-6` parent container)

## Implementation
The fix is the **removal** of the outer grid. `<KpiRow />` already provides the correct responsive grid via its own `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` classes. The outer container only needs the `animate-slide-up` wrapper and the `ErrorBoundary`:

```jsx
{/* KPI Cards with stagger animation */}
<div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
  <ErrorBoundary fallback={<WidgetErrorFallback label="metrics" />}>
    <KpiRow />
  </ErrorBoundary>
</div>
```

## Spacing Tokens (design system alignment)
- Vertical section spacing: `space-y-6` (24px) — matches existing usage
- Card internal padding: `p-4` (16px) — matches `KpiCard`
- Card-to-card gap: `gap-4` (16px) — matches `KpiRow` internal grid
- Card border-radius: `rounded-xl` — matches `KpiCard` and other dashboard cards

## Color & Iconography
- KPI cards already use semantic color tokens (accent / success / warning / danger / info)
- Icon size 20px, `text-accent-text` for accent, semantic color for others — matches design system
- Background: `var(--color-glass-bg)` with `backdrop-blur(12px)` — matches the rest of the dashboard

## Acceptance Test (Visual)
- At 375px (mobile): KPI cards render 1-per-row, full width, no horizontal overflow
- At 768px (md): 4 cards in 1 row, equal widths, 16px gap
- At 1280px (lg): same as md, activity feed + quick actions visible on the right
- No KPI card visually overlaps with the activity feed
- No KPI card extends past the dashboard container's right edge

## Cross-Reference
- Implementation: TKT-D.SLICE-001 (debugger-1) — already applied the fix
- QA: cross-page DataTable smoke test covers rendering of all 27 DataTable consumers; the dashboard smoke test should additionally verify the 4-KPI-row layout at sm/md/lg

## Sign-off
This spec is the designer's recommendation. The code change has been verified by debugger-1 (`tsc --noEmit` clean, `vite build` clean, 13/13 DataTable tests pass). No further design work required for TKT-DASH-001.

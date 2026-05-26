# Reporting & Analytics

**Status:** DRAFT  
**Date:** 2026-05-25  
**Domain:** Business Intelligence / Dashboard

---

## 1. Problem Statement

Aquerii collects rich business data — invoices, sales orders, purchase orders, CRM deals, tasks, time entries — but surfaces almost none of it as actionable intelligence. The dashboard exists but is sparsely populated. Users cannot answer fundamental questions like "What is my monthly revenue?", "Which customers owe me money?", "Which projects are over budget?", or "What is my pipeline value?".

---

## 2. Report Categories

### 2.1 Financial Reports
- **Revenue Over Time** — monthly/quarterly/yearly bar chart; compares to prior period
- **Outstanding Receivables (AR Aging)** — grouped: current, 1-30, 31-60, 61-90, 90+ days
- **Profit & Loss Summary** — total invoiced (revenue) vs total POs received (cost); gross margin
- **Invoice Status Breakdown** — pie: draft/sent/paid/overdue/void
- **Top Customers by Revenue** — ranked list with total invoiced, paid, outstanding
- **Tax Summary** — total tax collected (output VAT); total tax paid (input VAT on POs)

### 2.2 Sales Reports
- **Pipeline Value by Stage** — funnel/bar showing deal count + value at each stage
- **Win Rate** — won vs lost deals over time; segmented by deal owner
- **Sales Velocity** — average time from deal created → won; by owner and stage
- **Quota Attainment** — if revenue targets are set per workspace period
- **Top Deals Closing This Month** — sorted by expected close date

### 2.3 Inventory / Procurement Reports
- **Stock on Hand Value** — total inventory at cost
- **Low Stock Alerts** — products where `stock_level <= reorder_point`
- **Purchase Order Spend by Supplier** — ranked supplier list with PO total
- **Goods Received vs Ordered** — comparison of received vs original PO quantities

### 2.4 Project / Task Reports
- **Tasks by Status per Board** — stacked bar: todo/in-progress/review/done
- **Overdue Tasks** — list of tasks past due date, grouped by board
- **Team Workload** — tasks per assignee, by status
- **Board Velocity** — tasks completed per week (trend line)

### 2.5 Team / HR Reports (Employee Daily Tools — see EMPLOYEE_DAILY.md)
- **Attendance Summary** — check-in/check-out per employee per day
- **Leave Balance** — accrued vs taken per employee

---

## 3. Report Rendering Strategy

### No heavy chart library — lightweight SVG approach:

All charts are hand-rolled SVG or `<canvas>` components. Rationale:
- Keeps bundle size lean (no Recharts/Chart.js ~200KB)
- Full control over style matching design tokens
- Reference design (`F:\project-management`) uses the same approach

Chart components to build (in `components/charts/`):
| Component | Used for |
|-----------|---------|
| `BarChart` | Revenue over time, pipeline by stage |
| `LineChart` | Trend lines (velocity, deal count over time) |
| `DonutChart` | Invoice status breakdown, task status |
| `FunnelChart` | Pipeline stages |
| `HorizontalBarChart` | Top customers, team workload |
| `AreaChart` | Revenue / spend over time with fill |

All accept: `data`, `color`, `height`, `labelKey`, `valueKey`, `tooltipFormatter`.

### Date Range Picker

All reports support a date range picker:
- Presets: Last 7 days, Last 30 days, This month, Last month, This quarter, This year, Custom
- Stored in URL query params for shareable links

---

## 4. Dashboard Widgets

The main dashboard (`/`) becomes a configurable widget grid.

### 4.1 Default Widget Set

```
┌─────────────────────────────────────────────────────────┐
│ [Revenue MTD]  [Outstanding AR]  [Open Deals]  [Tasks]  │
│  stat card      stat card          stat card    stat card│
├────────────────────────┬────────────────────────────────┤
│ Revenue (12 months)    │ Invoice Status Breakdown        │
│ bar chart              │ donut chart                     │
├────────────────────────┴────────────────────────────────┤
│ Recent Activity Feed                                     │
│ (last 10 changes across all modules)                     │
├────────────────────────┬────────────────────────────────┤
│ Overdue Invoices (list)│ Deals Closing This Week (list) │
└────────────────────────┴────────────────────────────────┘
```

### 4.2 Stat Cards

```tsx
interface StatCardProps {
    label: string
    value: string | number
    change?: { value: number; direction: 'up' | 'down'; label: string }
    icon: React.ComponentType
    iconColor: string // CSS color token
    currency?: boolean
    loading?: boolean
}
```

Change indicator: green arrow up for revenue/paid, red arrow down for overdue.

### 4.3 Configurable Widgets (Phase 2)

Users can drag-and-drop widgets, add/remove from a widget catalogue, resize (1×1, 2×1, 2×2).

---

## 5. Backend: Report Endpoints

```
GET /api/workspaces/{w}/reports/financial?period=month&from=&to=
GET /api/workspaces/{w}/reports/revenue-over-time?granularity=monthly&from=&to=
GET /api/workspaces/{w}/reports/ar-aging
GET /api/workspaces/{w}/reports/invoice-status
GET /api/workspaces/{w}/reports/top-customers?limit=10&from=&to=
GET /api/workspaces/{w}/reports/pipeline
GET /api/workspaces/{w}/reports/win-rate?from=&to=
GET /api/workspaces/{w}/reports/stock-on-hand
GET /api/workspaces/{w}/reports/low-stock
GET /api/workspaces/{w}/reports/tasks-summary
GET /api/workspaces/{w}/dashboard
```

### Example: Revenue Over Time

```php
public function revenueOverTime(Request $request, Workspace $workspace): JsonResponse {
    $from        = Carbon::parse($request->input('from', now()->subYear()));
    $to          = Carbon::parse($request->input('to', now()));
    $granularity = $request->input('granularity', 'monthly'); // weekly|monthly|quarterly
    
    $format = match($granularity) {
        'weekly'    => '%Y-%W',
        'quarterly' => '%Y-Q%m',
        default     => '%Y-%m',
    };
    
    $data = Invoice::where('workspace_id', $workspace->id)
        ->where('status', 'paid')
        ->whereBetween('paid_at', [$from, $to])
        ->selectRaw("DATE_FORMAT(paid_at, '{$format}') as period, SUM(total) as revenue, COUNT(*) as count")
        ->groupBy('period')
        ->orderBy('period')
        ->get();
    
    return response()->json($data);
}
```

### Example: AR Aging

```php
public function arAging(Workspace $workspace): JsonResponse {
    $today = now()->toDateString();
    
    $buckets = Invoice::where('workspace_id', $workspace->id)
        ->whereIn('status', ['sent', 'partially_paid', 'overdue'])
        ->selectRaw("
            SUM(amount_due) as total,
            SUM(CASE WHEN due_date >= ? THEN amount_due ELSE 0 END) as current_bucket,
            SUM(CASE WHEN due_date < ? AND due_date >= ? THEN amount_due ELSE 0 END) as days_1_30,
            SUM(CASE WHEN due_date < ? AND due_date >= ? THEN amount_due ELSE 0 END) as days_31_60,
            SUM(CASE WHEN due_date < ? AND due_date >= ? THEN amount_due ELSE 0 END) as days_61_90,
            SUM(CASE WHEN due_date < ? THEN amount_due ELSE 0 END) as days_90_plus
        ", [
            $today,
            $today, now()->subDays(30)->toDateString(),
            now()->subDays(30)->toDateString(), now()->subDays(60)->toDateString(),
            now()->subDays(60)->toDateString(), now()->subDays(90)->toDateString(),
            now()->subDays(90)->toDateString(),
        ])
        ->first();
    
    return response()->json($buckets);
}
```

---

## 6. Report Export (CSV / PDF)

All reports support export:

```
GET /api/workspaces/{w}/reports/{report}/export?format=csv&from=&to=
```

CSV: streams directly. PDF: renders a Blade template via Gotenberg (see `DOCUMENT_TEMPLATES.md`).

Report PDF template: Aquerii header with workspace logo, date range, then tabular data. Page numbers, generated timestamp in footer.

---

## 7. Caching Strategy

Report queries can be expensive. Cache per workspace + date range:

```php
$cacheKey = "report:{$workspace->id}:{$reportName}:{$from}:{$to}";
$ttl      = 15 * 60; // 15 minutes

return Cache::remember($cacheKey, $ttl, fn() => $this->buildReport(...));
```

Cache invalidated on: invoice paid/updated, deal moved, task status changed (via model observers dispatching cache busts).

---

## 8. New Route

```
/reports  → ReportsPage with sidebar navigation
  /reports/financial
  /reports/sales
  /reports/inventory
  /reports/projects
```

Add to AppLayout sidebar under a "Reports" section (icon: `BarChart2` from lucide).

---

## 9. Open Questions

- Should report data be pre-aggregated nightly into a `report_snapshots` table for performance at scale, or is query-time fine for initial release?
- PDF report export: use Gotenberg like document PDFs, or a simpler CSV-only approach first?
- Revenue target / quota: does Phase 1 need a way to set a monthly revenue target to show attainment % on dashboard?

---

## 10. Success Criteria

- [ ] Dashboard shows 4 stat cards (Revenue MTD, Outstanding AR, Open Deals, Open Tasks) with real data
- [ ] Dashboard shows Revenue bar chart (12 months) and Invoice Status donut chart
- [ ] `/reports/financial` page: Revenue over time, AR Aging, Invoice Status, Top Customers
- [ ] `/reports/sales` page: Pipeline value by stage, Win Rate, Top Deals closing this month
- [ ] `/reports/inventory` page: Stock on Hand Value, Low Stock list, Spend by Supplier
- [ ] All reports support date range picker with presets
- [ ] All reports export to CSV
- [ ] Chart components: BarChart, DonutChart, FunnelChart, HorizontalBarChart implemented
- [ ] Report endpoints cached 15 minutes; cache invalidated on data change
- [ ] Tests: `RevenueOverTime` query; `ArAging` bucket calculation; `TopCustomers` ranking

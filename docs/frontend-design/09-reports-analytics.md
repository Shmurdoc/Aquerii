# Reports & Analytics — Frontend Design

## Overview

The Reports module aggregates data across Finance (expenses, procurement, inventory) and CRM (pipeline, forecasts, win/loss, funnel, churn, LTV, cohort) into a single analytics hub. Every report must have a chart, a data table fallback, date range control, and CSV export. This is the dashboard for decision-makers — accuracy and load speed matter more than visual flair.

## Architecture

### Routes

```
/workspaces/{workspaceId}/reports                      → ReportsPage (default tab: Overview)
/workspaces/{workspaceId}/reports/overview             → Overview tab
/workspaces/{workspaceId}/reports/expenses             → Expenses tab
/workspaces/{workspaceId}/reports/procurement          → Procurement tab
/workspaces/{workspaceId}/reports/inventory            → Inventory tab
/workspaces/{workspaceId}/reports/crm                  → CRM Reports (sub-tabs)
```

### Component Tree

```
ReportsPage
├── ReportsHeader (page title + export all button? — future)
├── ReportsTabs (Overview | Expenses | Procurement | Inventory | CRM Reports)
│
├── [OverviewTab]
│   ├── DateRangePicker (presets: 7d, 30d, 90d, 1y, custom | default: 30d)
│   ├── KpiRow (4 stat cards)
│   │   ├── Total Revenue (currency, % change vs previous period)
│   │   ├── AR Aging (average days, trend arrow up/down)
│   │   ├── Top Customer (name, revenue this period)
│   │   └── Invoices Overdue (count + total amount)
│   ├── RevenueTrendChart (line chart, daily/weekly revenue over time)
│   │   └── X: date, Y: revenue. Series: actual, projected?
│   ├── ARAgingChart (bar chart, buckets: 0-30, 31-60, 61-90, 90+ days)
│   ├── TopCustomersTable (top 10 by revenue, with columns: name, revenue, invoices, % total)
│   └── InvoiceStatusBreakdown (donut chart: paid, pending, overdue, canceled)
│
├── [ExpensesTab]
│   ├── DateRangePicker
│   ├── CategoryBreakdownChart (horizontal bar chart: category vs total)
│   └── ExpenseTrendChart (line/area chart: expenses over time, by category series)
│
├── [ProcurementTab]
│   ├── DateRangePicker
│   ├── PoStatusBreakdown (pie chart: open, approved, received, closed, canceled)
│   └── VendorAnalysisTable (vendor, PO count, total spend, avg delivery time)
│
├── [InventoryTab]
│   ├── StockLevelsChart (bar chart: item vs current stock)
│   ├── LowStockAlerts (table: items where stock < reorder_point, with supplier info)
│   └── InventoryTurnover (line chart: turnover ratio over time)
│
└── [CrmReportsTab] (sub-tabs)
    ├── CrmReportSubTabs (Pipeline Velocity | Revenue Forecast | Win/Loss | Lead Sources | Funnel | Churn Risk | Customer LTV | Cohort)
    │
    ├── [PipelineVelocity]
    │   ├── DateRangePicker
    │   ├── Chart (bar chart: deals moved through stages in period, colored by stage)
    │   └── Table (stage, avg days in stage, deals entered, deals exited)
    │
    ├── [RevenueForecast]
    │   ├── Chart (area/line chart: projected revenue vs actual over time)
    │   │   └── Series: committed (stage >= X), pipeline (stage < X), actual (closed won)
    │   └── Table (forecast by period: period, committed, pipeline, total, actual)
    │
    ├── [WinLoss]
    │   ├── Chart (pie or bar chart: won vs lost, count + value)
    │   ├── LossReasonBreakdown (bar chart: reason → count)
    │   └── Table (period, won count, won value, lost count, lost value, win rate %)
    │
    ├── [LeadSources]
    │   ├── Chart (pie chart: source → lead count)
    │   ├── Chart (bar chart: source → conversion rate %)
    │   └── Table (source, leads, converted, conversion rate, avg deal value)
    │
    ├── [Funnel]
    │   ├── FunnelChart (true funnel shape: stage → count, width proportional to count)
    │   └── Table (stage, count, % of top, drop-off rate)
    │   └── Note: Funnel chart is notoriously difficult with charting libraries. recharts has a funnel, Chart.js does not natively. Consider a custom SVG funnel if using Chart.js.
    │
    ├── [ChurnRisk]
    │   ├── DateRangePicker
    │   ├── Chart (line chart: churn rate % over time)
    │   └── Table (customer, risk score, last activity date, deal value, contacts)
    │
    ├── [CustomerLTV]
    │   ├── DateRangePicker
    │   ├── Chart (bar chart: cohort → avg LTV)
    │   └── Chart (line chart: LTV over customer lifetime months)
    │
    └── [Cohort]
        ├── DateRangePicker
        ├── CohortGrid (heatmap-style table: rows = acquisition month, columns = period N, cells = count/revenue)
        └── Chart (line chart: selected cohort series over time)

Note: Every report tab follows the same structure:
1. DateRangePicker at top
2. Chart(s) — loading skeleton on mount
3. Data table below chart (always visible, sorted by default column)
4. CSV export button (exports the data backing the current chart)
5. Empty state if no data
6. Error state on fetch failure
```

### Shared Chart Config

All charts use the same library (recharts preferred for React). Consistent configuration:

- **Colors:** 10-color palette (defined in design system). No brand colors — use sequential and diverging color scales.
- **Tooltip:** always present. Shows value + label on hover.
- **Legend:** bottom, horizontal. Clicking series toggles visibility.
- **Responsive:** width 100%, height fixed per chart type (300px small, 450px default).
- **Animation:** fade-in on load only. No hover animations — they distract from data.
- **Empty chart:** "No data available for this period." centered text. Do NOT render an empty chart canvas.
- **Loading skeleton:** Rectangular pulse animation matching chart dimensions.
- **Error chart:** "Failed to load chart data. Retry." centered text + retry button.

### Chart Types Reference

| Chart Type | Use Case | Library Support |
|---|---|---|
| Bar (vertical) | Category comparisons | recharts BarChart |
| Bar (horizontal) | Rankings | recharts BarChart layout=vertical |
| Line | Trends over time | recharts LineChart |
| Area | Cumulative trends | recharts AreaChart |
| Pie | Composition (few categories) | recharts PieChart |
| Donut | Composition (center hole for total) | recharts PieChart innerRadius |
| Funnel | Conversion stages | Custom SVG — recharts has no native funnel |
| Heatmap | Cohort grid | Custom table with color-coded cells (recharts has no heatmap) |

## Data Flow

### Endpoint Integration

| Endpoint | Tab | Response Shape |
|---|---|---|
| GET /api/reports/dashboard | Overview | `{ revenue: { total, change, trend }, ar_aging: { avg_days }, top_customers: Array, invoice_breakdown: Object }` |
| GET /api/reports/expenses | Expenses | `{ categories: [{ name, total }], trend: [{ date, amount, category }] }` |
| GET /api/reports/procurement | Procurement | `{ po_status: [{ status, count, total }], vendor_analysis: Array }` |
| GET /api/reports/inventory | Inventory | `{ stock_levels: Array, low_stock: Array, turnover: Array }` |
| GET /api/reports/pipeline | CRM: Pipeline Velocity | `{ stages: [{ name, avg_days, entered, exited }] }` |
| GET /api/reports/revenue-forecast | CRM: Revenue Forecast | `{ periods: [{ period, committed, pipeline, actual }] }` |
| GET /api/reports/win-loss | CRM: Win/Loss | `{ summary: { won, lost, win_rate }, by_reason: [{ reason, count }] }` |
| GET /api/reports/lead-sources | CRM: Lead Sources | `{ sources: [{ name, leads, converted, conversion_rate, avg_value }] }` |
| GET /api/reports/funnel | CRM: Funnel | `{ stages: [{ name, count }] }` |
| GET /api/reports/churn-risk | CRM: Churn Risk | `{ rate_trend: [{ date, rate }], at_risk: Array }` |
| GET /api/reports/customer-ltv | CRM: Customer LTV | `{ cohorts: [{ period, avg_ltv }], lifetime: [{ month, ltv }] }` |
| GET /api/reports/cohort | CRM: Cohort | `{ grid: [[{ period, count, revenue }]], headers: Array }` |

All endpoints accept query params: `?start_date=...&end_date=...&workspace_id=...`.

### Date Range State

The DateRangePicker is shared across all tabs within a group. Each tab group (Overview, Expenses, etc.) maintains independent date range state.

```typescript
type DateRange = {
  preset?: '7d' | '30d' | '90d' | '1y' | 'custom';
  startDate: string; // ISO
  endDate: string;   // ISO
};
```

On preset change, recalculate startDate/endDate. On custom, show calendar picker.

When the date range changes, refetch ALL charts in that tab with new dates.

### CSV Export

Every data table has a "Download CSV" button. Implementation:

```typescript
async function handleExport(
  endpoint: string,
  dateRange: DateRange,
  filename: string
): Promise<void> {
  const response = await fetch(`${endpoint}?start_date=...&end_date=...&format=csv`);
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${dateRange.startDate}-${dateRange.endRange}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**CRITIQUE:** This design assumes the backend supports `?format=csv` on every report endpoint. If it doesn't, the frontend must generate CSV from JSON client-side. Client-side generation handles 10k+ rows poorly (memory for string concatenation). **Fix:** the backend MUST support `?format=csv` on all report endpoints. The frontend should never generate large CSVs.

Alternatively, use a dedicated export endpoint: `GET /api/reports/export?report=pipeline-velocity&format=csv&start_date=...&end_date=...` that returns a streaming CSV download. This is the correct approach — separate concerns.

## Loading / Empty / Error States

### Loading

Every chart skeleton: rectangular pulse animation matching the chart's expected dimensions.

- **KPI row:** 4 skeleton stat cards (icon + number + label placeholders).
- **Line/bar charts:** Rectangle skeleton with horizonatal grid lines animating.
- **Pie/donut:** Circular skeleton with pulse.
- **Funnel:** Trapezoid-shaped skeleton.
- **Cohort heatmap:** Grid of small squares with staggered pulse.
- **Tables:** 8 skeleton rows with 4-5 columns.

### Empty

- **No data at all:** "No data available for this period. Try a different date range." + suggestion to extend range.
- **No data in specific chart:** Don't render chart canvas — show "Open no data" with icon.
- **No cohorts yet:** "Not enough data to show cohorts. Cohort analysis requires at least 3 months of data."

### Error

- **Individual chart error:** Show error within chart container (not page-level). "Failed to load. Retry." + retry button scoped to that chart.
- **Critical chart error (KPI row fails):** More prominent — KPIs are the page header. Show full-width error banner + retry.
- **CSV export failure:** Toast error. Don't block page.

## Performance

| Concern | Strategy |
|---|---|
| Multiple charts per tab | Fetch all data in parallel per tab. Show loading skeletons per-chart. Don't waterfall — one fetch per endpoint, not per chart component. |
| Large datasets (2+ years) | Backend must aggregate. Frontend should never receive more than 365 data points per series. |
| Chart re-renders | Memoize chart data. Only re-render chart when data reference changes (not on every state update). |
| Date range change | Cancel all in-flight requests before fetching new data. Avoid race conditions where old data overwrites new. |
| CSV export for large data | Backend generates and returns a download URL or streams. Don't load 100k rows into browser memory. |
| Tab switching | Keep inactive tabs mounted but hidden (`display: none` or `<KeepAlive>` equivalent). Don't refetch when switching back to an already-loaded tab. Only refetch on date range change. |

## Accessibility

- Charts must have `role="img"` and `aria-label` describing the data summary (e.g., "Line chart showing revenue over the last 30 days, starting at $50k and ending at $72k").
- Every chart must have a hidden data table beneath it as a screen-reader fallback.
- Date picker: proper date input patterns (`type="date"` or accessible combobox). Don't use flatpickr-style custom date pickers without full keyboard support.
- Tab panels: `role="tabpanel"`, `aria-labelledby` matching tab button.
- CSV export button: `aria-label="Export [report name] as CSV"`.
- Loading states: `aria-busy="true"` on chart containers, dismissed when loaded.

## CRITIQUE: Weak Ideas & Risks

1. **"Date range picker on all reports" sounds good but will be a nightmare for CRM cohort reports.** Cohorts by definition are fixed time windows (monthly cohorts). Applying a date range filter to a cohort report changes which cohorts are included — the chart isn't "filtered by date", it changes the entire dataset. **Fix:** Cohort reports should NOT have a date range picker. They should have a cohort selection (select which cohorts to display) and a period window selector.

2. **No comparison periods.** A 30-day revenue chart with no "last period" overlay is useless for decision-making. Every KPI should show % change vs previous period. Every trend chart should support toggling a "previous period" overlay. This means the API must return `previous_period` data — which it doesn't based on the endpoint shapes.

3. **CSV export on "every table" ignores that some reports don't have table data.** Funnel charts, pie charts, and cohort grids are aggregate shapes — there's no underlying row-level data to export. The "CSV export on all tables" rule forces teams to invent rows for aggregate data, which misleads users into thinking they can get granular data when they can't.

4. **API endpoints return flat data but charts need multi-layered data for comparisons.** The `GET /api/reports/expenses` endpoint returns `categories: [{name, total}]` — great for a bar chart. But what if users want to compare this month vs last month? The endpoint doesn't support period-over-period. **Fix:** Every report endpoint must accept an optional `compare_period=true` query param that returns `current` and `previous` series.

5. **No role-based filtering.** If Aquerii has multi-workspace with role-based access, some users may not have permission to see revenue or expenses. The KPI row showing "Total Revenue" could be a data leak. The frontend should handle 403 on individual endpoints gracefully — hide that section, don't error the whole page.

6. **Funnel chart has no dedicated endpoint shape.** The `GET /api/reports/funnel` endpoint returns `stages: [{name, count}]`. That's enough for a basic funnel, but funnels often need conversion rates and drop-off percentages computed. Either the frontend computes intermediate metrics, or the API returns them. Frontend computation is fine for a v1 — just be explicit.

7. **Cohort grid data shape is the most complex and most likely to be wrong.** The `grid: [[{period, count, revenue}]]` is a 2D array. The frontend rendering logic must transpose this correctly — rows are cohort periods, columns are time offsets. One off-by-one error and the entire grid is misleading. This needs careful TypeScript types and unit tests on the data transform function.

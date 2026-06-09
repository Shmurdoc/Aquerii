# 19 — Team Capacity Dashboard

---

## Routes

```
/workspaces/{workspaceId}/capacity           → CapacityDashboard
/workspaces/{workspaceId}/capacity/team      → TeamCapacityView
/workspaces/{workspaceId}/capacity/analytics → CapacityAnalytics
```

---

## Data Source

**BRUTAL CALL-OUT: The superprompt describes "AI-powered staffing recommendations," "capacity heatmaps with color intensity," "skill-based assignment suggestions," and "burndown charts." NONE of this has backend support. The backend provides: GET/POST /api/employees (basic CRUD — no workload, no skills, no capacity model), GET/POST /api/leave-requests (no PTO balance/accrual). There is NO workload calculation endpoint, NO skill tracking, NO capacity model, NO project allocation data. Everything below that requires a calculation is marked. Ship as a manual-only v1: list employees with task counts computed client-side from items.**

---

## Main Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Team Capacity                                          [Time Range Selector]│
│                                                         [This Month ▾]       │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Total FTEs   │  │  Allocated   │  │  Available   │  │  Overloaded  │     │
│  │     12        │  │    78%       │  │    22%       │  │     3        │     │
│  │   employees   │  │   of total   │  │   capacity   │  │   members    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                              │
│  [Team Overview] [Heatmap] [Burndown]                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Summary Cards

Four KPI cards at the top. All data is **placeholder until backend capacity model exists**:
- **Total FTEs**: count of active employees in workspace. Source: GET /api/employees (exists).
- **Allocated**: percentage of total capacity currently assigned. ❌ **No backend support — hardcode as "—%" until workload API exists.**
- **Available**: unallocated capacity. ❌ **No backend support — hardcode.**
- **Overloaded**: count of members with >100% allocation. ❌ **No backend support — hardcode as "—".**

Each card: icon (left), value (bold, 24px), label (12px gray), subtle border-left color (blue, green, yellow, red).

---

## Team Overview Tab

### Member Allocation List

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  Team Members (12)                      [Search name...]        [Sort: Name ▾]     │
├─────────┬──────┬─────────┬──────────┬──────────────────────────────────┬───────────┤
│  Member │ Role │ Current │ Capacity │ Task Load (this month)           │ Status    │
│         │      │ Projects│ Available│                                   │           │
├─────────┼──────┼─────────┼──────────┼──────────────────────────────────┼───────────┤
│  ○ Jane │ Sr.  │ Design  │   30%    │ ████████████░░░░░░░░░░░  12/20   │ ● Healthy │
│  Smith  │ Dev  │ System  │          │                                   │           │
│         │      │ Mobile  │          │                                   │           │
├─────────┼──────┼─────────┼──────────┼──────────────────────────────────┼───────────┤
│  ○ John │ PM   │ Q3 Plan │    0%    │ ████████████████████████  18/18   │ ▲ Full    │
│  Doe    │      │         │          │                                   │           │
├─────────┼──────┼─────────┼──────────┼──────────────────────────────────┼───────────┤
│  ○ Alice│ Des. │ Brand   │    0%    │ █████████████████████████  22/18  │ 🔴 Over   │
│  Wang   │      │ Refresh │          │                                   │           │
└─────────┴──────┴─────────┴──────────┴──────────────────────────────────┴───────────┘
```

**BRUTAL CALL-OUT: "Current Projects" column assumes a project-allocation model that does NOT exist. The backend has no concept of assigning employees to projects with allocation percentages. "Task Load" is approximated by counting items assigned to this employee (GET /api/workspaces/{id}/boards/{boardId}/items with assignee filter) — this is the ONLY v1-capable metric.**

Each row:
- **Avatar** (32px, circular, initials fallback) + Name. Green dot if online (socket presence — exists).
- **Role**: from employee record. Exists.
- **Current Projects**: ❌ **No backend data. Show "—" or group board names manually.**
- **Capacity Available**: ❌ **No backend data. Show "—%".**
- **Task Load bar**: horizontal bar, color-coded (green <70%, yellow 70-90%, red >90%). Width = assigned items / estimated capacity. V1: use 20 as hardcoded "capacity" per person. Imperfect but shippable.
- **Status tag**: "Healthy" (green), "Full" (yellow), "Over" (red). Computers from task load ratio.

### Member Detail Row (expandable)

Click any row to expand an inline detail panel:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ▲ Jane Smith — Detailed Load                                       [Close] │
│                                                                              │
│  Assigned Tasks                          Meetings (this month)               │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │  Design System V2        Due 05/15│  │  Sprint Planning    May 6  2hr │  │
│  │  Mobile Nav Redesign     Due 05/20│  │  Design Review      May 8  1hr │  │
│  │  Component Audit         Due 06/01│  │  1:1 with Manager   May 10 30m │  │
│  │  ...                              │  │  ...                          │  │
│  │  Total: 12 tasks (18 assigned hrs)│  │  Total: 6 meetings (8 hrs)    │  │
│  └────────────────────────────────────┘  └────────────────────────────────┘  │
│                                                                              │
│  Leave (this month)                    Utilization                           │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │  No leave scheduled               │  │  ████████████░░░░░░░░░░░       │  │
│  │  Used: 0 of 15 days              │  │  60% utilized  •  40% available │  │
│  └────────────────────────────────────┘  └────────────────────────────────┘  │
│                                                                              │
│  [View Board Items]  [View Meetings]  [Adjust Allocation]  [Send Message]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Tasks section**: assigned items from all boards. GET /api/workspaces/{id}/boards/{boardId}/items with `assignee_id` filter. Client-side grouping across boards. **Works in v1.**
- **Meetings section**: ❌ **No meetings/calendar endpoints exist (see FILE 14). Show "—" or skip entirely.**
- **Leave section**: leave requests for this employee within the current month. GET /api/leave-requests filtered by employee + date range. **Works in v1.** Leave balance field ("15 days") must be hardcoded — no accrual endpoint exists.
- **Utilization chart**: computed as (task hours + meeting hours + leave hours) / (working days × 8). **"Meeting hours" require meetings API. Without it, show task-only utilization with disclaimer.**
- **Action buttons**: View Board Items (navigates to board with assignee pre-filtered), View Meetings (disabled — no meetings), Adjust Allocation (opens modal — ❌ **no backend, show placeholder**), Send Message (opens chat — ❌ **no chat system**).

---

## Heatmap Tab

### Capacity Heatmap Grid

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Capacity Heatmap                                          [Week ▾] [May 2026]  │
│                                                                                 │
│  Member        Mon 5/4   Tue 5/5   Wed 5/6   Thu 5/7   Fri 5/8   Total Tasks   │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  Jane Smith     ██████    ████████  ████      ████████   ██        12           │
│  John Doe       ████████  ████████  ████████  ████████   ████████   18           │
│  Alice Wang     ████████  ████████  ██████████████████   ████████   22           │
│  Bob Chen       ██        ██        ██        ██         ██         4            │
│  ─────────────────────────────────────────────────────────────────────────────   │
│                                                                                 │
│  Color Legend:  Low ██  Medium ██  High ██  Over ██                             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**BRUTAL CALL-OUT: This entire component is aspirational. Each cell requires per-day workload data that does not exist anywhere in the backend. The heatmap cannot be implemented without a new endpoint that returns employee allocation per day. Below is the design anyway — implement as described only when the backend supports it.**

- **X-axis**: days (week view) or weeks (month view). Toggle via dropdown.
- **Y-axis**: team members, sorted by workload (highest first).
- **Cell color intensity**:
  - 0-3 tasks: `--color-bg-tertiary` (light gray)
  - 4-6 tasks: `--color-primary-200` (light blue)
  - 7-10 tasks: `--color-primary-400` (medium blue)
  - 11+ tasks: `--color-danger` (red)
  - Leave day: `--color-success-bg` (green) with "🏖" indicator
- **Cell tooltip on hover**: shows employee name, date, task count, meeting hours, leave status.
- **Total Tasks column**: rightmost, bold. Sum of assigned items across visible period.
- **Color Legend**: below the grid.

**Implementation path**:
1. V1: Skip this tab entirely. Show a banner: "Heatmap requires workload data. Configure project allocations in Settings."
2. V2: Compute pseudo-heatmap from item due_dates. Count items by due_date per employee. Fill cells. This is inaccurate (due_date ≠ workload) but visually functional.
3. V3+: Once backend supports per-day allocation, replace with real data.

---

## Capacity Analytics Tab (Burndown)

### Burndown Chart

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Burndown — Sprint 14              [Team ▾]  [Sprint ▾]  [Date Range ▾]     │
│                                                                              │
│  points                                                                      │
│  120 │  ● (ideal)                                                            │
│      │   \                                                                   │
│   90 │    \                                                                  │
│      │     \                                                                 │
│   60 │      ●───────────────────────────────────────● (actual)               │
│      │       \                                     /                         │
│   30 │        \                                   /                          │
│      │         ●───────────────●─────●──────────●                            │
│    0 │  ──────────────────────────────────────────────────────────           │
│      │    Wk1   Wk2   Wk3   Wk4   Wk5   Wk6   Wk7   Wk8                     │
│                                                                              │
│  ● Committed: 120 pts    ● Completed: 87 pts   ● Velocity: 14.5 pts/sprint  │
│  ▲ Remaining: 33 pts     ● Scope change: +12 pts                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**BRUTAL CALL-OUT: Burndown charts require a sprint/iteration model that does NOT exist. The backend has items with due_dates but no sprint assignment, no points/estimate field, no velocity tracking. V1 cannot ship burndown in any meaningful way. The design below is aspirational — implement only when backend supports sprints and estimates.**

- **Line chart** (Chart.js or Recharts): X-axis = weeks, Y-axis = story points.
- **Ideal line**: straight diagonal from committed points to zero across sprint duration.
- **Actual line**: cumulative completed points over time.
- **Data points**: weekly snapshots of remaining vs completed.
- **Legend**: below chart showing committed, completed, remaining, scope change, velocity.
- **Filter controls**: Team dropdown, Sprint dropdown, custom date range.

**Implementation path**:
1. V1: Disabled tab with message: "Burndown requires sprint tracking. Configure iterations in Board Settings."
2. V2+: Chart library wrapper ready for when backend adds sprint/estimate support.

---

## Assignment Recommendations (Inline)

### Create/Edit Item — Suggested Assignee

When editing an item's assignee field, show a "Suggest" button:

```
Assignee: [Jane Smith ▾]  [Suggest]

┌─────────────────────────────────────────┐
│  Recommended Assignees                  │
│  ────────────────────────               │
│  ○ Alice Wang (40% free)   Skills match │
│  ○ Bob Chen  (60% free)   Needs ramp-up│
│  ○ Jane Smith (30% free)  Currently has │
│                             5 tasks due │
│                    this week            │
│  [Use Alice] [Use Bob]                  │
└─────────────────────────────────────────┘
```

**BRUTAL CALL-OUT: "Skills match" requires employee skill data that does NOT exist. "Currently has N tasks due this week" can be computed client-side from item due_dates — this is the ONLY v1-capable recommendation signal. The entire "best-fit" algorithm is aspirational.**

- **V1**: Show simple list of employees sorted by least-assigned items. No skills, no capacity percentage, no magic. Just task count per employee. Click to select.
- **V2+**: When backend supports skills, allocation %, and workload, switch to weighted algorithm: (1 - current_load_ratio) × 0.4 + skill_match_score × 0.4 + availability_score × 0.2.
- **Edge case**: All employees at capacity? Show warning: "All team members are at or near capacity. Consider adjusting deadlines or reassigning priorities."

---

## Vacation / Holiday Calendar Integration

### Leave Overlay on Team Overview

Leave data overlays on the member rows:

```
├─────────┼──────┼─────────┼──────────┼──────────────────────────────────┼───────────┤
│  ○ Jane │ Sr.  │ Design  │   30%    │ ████████████░░░░░░░░░░░  12/20  │ ● Healthy │
│  Smith  │ Dev  │ System  │          │  🏖 May 10-14 (Vacation)        │           │
```

Each row shows upcoming leave as a small chip below the member name. Data from GET /api/leave-requests (exists).

### Leave Calendar Sidebar

When viewing the Heatmap tab, a right sidebar shows:

```
┌───────────────────────┐
│  Leave This Month     │
│  ──────────────────── │
│  May 10-14           │
│  Jane Smith          │
│  Vacation (5 days)   │
│  ──────────────────── │
│  May 18              │
│  John Doe            │
│  Personal (1 day)    │
│  ──────────────────── │
│  May 22-23           │
│  Bob Chen            │
│  Sick (2 days)       │
├───────────────────────┤
│  Public Holidays      │
│  ──────────────────── │
│  May 27 — Memorial Day│
└───────────────────────┘
```

- **Leave entries** from API (exists). Grouped by date.
- **Public holidays**: ❌ **No endpoint for public holidays. Hardcode key dates or skip.**
- Each entry: Employee name, type, duration, date range.
- Highlight employee rows in the heatmap when they have overlapping leave.

---

## States

### Loading State

- Summary cards: skeleton rectangles (150×80px) with shimmer.
- Member list: 5 skeleton rows with avatar circle (32px) + 3 text lines each.
- Heatmap tab: 8 skeleton rows × 7 skeleton cells each.
- Loading state persists until all parallel fetchers resolve: employees, leave requests, items.

### Empty State

```
         👥
   No team members yet
  Invite employees to see capacity data.
        [Invite Members]
```

Only shown when employee count === 0. Invite button navigates to Workspace Settings → Members.

### Error State

```
         ⚠️
   Could not load capacity data
  The capacity server is not responding.
  Data shown may be stale (last updated: 10:32 AM).
        [Retry]  [View Cached]
```

- Retry button re-fetches all data.
- "View Cached" shows last successful data from IndexedDB (if offline mode exists — ❌ **no offline mode**).

### Partial Data State

When some API calls succeed and others fail (e.g., items loaded but leave requests failed):
- Show a top banner: "Leave data unavailable. Capacity may be inaccurate."
- Fields relying on failed data show "—".
- Do NOT block the entire page for partial failures.

---

## BRUTAL CALL-OUTS — Full Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **Employee list** | ✅ Full backend | None |
| **Leave requests** | ✅ Full backend | None |
| **Task assignments from items** | ✅ Exists | Count items per assignee client-side |
| **Capacity percentage** | ❌ **No model** | Entirely new backend entity needed (employee_project_allocations) |
| **Workload per day** | ❌ **No model** | New endpoint needed: GET /api/capacity/workload |
| **Capacity heatmap** | ❌ **No data** | See above. Cannot ship without workload data |
| **Skills tracking** | ❌ **Does not exist** | New database table + CRUD endpoints |
| **Skill-based assignment** | ❌ **Does not exist** | Dependent on skills tracking |
| **Burndown charts** | ❌ **No sprint model** | Items have no estimate/points field. New sprint entity needed |
| **Project allocation** | ❌ **Does not exist** | No concept of assigning employees to projects with % |
| **Public holidays** | ❌ **No endpoint** | Hardcode or skip |
| **Meetings integration** | ❌ **No meetings API** | Blocked until meetings exist (see FILE 14) |
| **Sprint/iteration model** | ❌ **Does not exist** | Needs board iterations or sprint entity |
| **Member assignment suggestions** | ⚠️ Partial | V1: sort by task count only. Skills + capacity = future |
| **Capacity analytics** | ❌ **No data source** | Summary cards are decorative without workload API |

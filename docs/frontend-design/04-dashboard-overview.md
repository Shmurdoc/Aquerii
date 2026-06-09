# Aquerii Dashboard Overview — Production Spec

## Build Status (v0.1 — May 28, 2026)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| KpiCard | `dashboard/KpiCard.tsx` | ✅ Built | 5 color variants, trend arrows, skeleton/empty states, click handler |
| ActivityFeed | `dashboard/ActivityFeed.tsx` | ✅ Built | Date-grouped, read/unread, auto-scroll, skeletons |
| MyTasksWidget | `dashboard/MyTasksWidget.tsx` | ✅ Built | TanStack Query, boards+items, user filter, priority badges, overdue warning |
| QuickActions | `dashboard/QuickActions.tsx` | ✅ Built | 5 action buttons, distinct colors, responsive scroll |
| DashboardPage | `pages/DashboardPage.tsx` | ✅ Rewritten | Welcome + 4 KPI cards + MyTasks + ActivityFeed + QuickActions, responsive grid |
| MyDayPage | `pages/my-day/MyDayPage.tsx` | ✅ Built (mock data) | Sections: Overdue/Today/Tomorrow/This Week/Later. Route not wired — backend missing |
| DashboardWidget | `dashboard/DashboardWidget.tsx` | ⚠️ Existing | Pre-existing wrapper; kept for backwards compat |

### Not Yet Built (v0.2+)
- Real-time socket updates on dashboard widgets
- Customizable widget grid (add/remove/reorder)
- Saved dashboard layouts per user
- Notification real-time push to activity feed

## Purpose

The dashboard is the first thing every user sees after login. It must communicate what's happening now, what needs attention, and what's possible — within the first 2 seconds. It's not a feature gallery. It's a command center: surface the user's tasks, their team's activity, key metrics, and a clear path to the next action. If the workspace is empty, the dashboard's job is to get the user to create something within 10 seconds.

---

## API Contract

### Consumed Endpoints

#### GET /api/workspaces/{id}/boards
```json
// Returns all boards for recent boards widget
{
  "boards": [
    { "id": "b1", "name": "Sprint 24", "item_count": 42, "type": "kanban", "updated_at": "2026-05-27T14:00:00Z" }
  ]
}
```

#### GET /api/workspaces/{id}/notifications
```json
{
  "unread_count": 5,
  "items": [
    { "id": "n1", "type": "mention", "title": "Jane mentioned you in 'Fix login bug'", "created_at": "..." }
  ]
}
```
Used for unread count in KPI card + recent activity feed.

#### GET /api/reports/dashboard
```json
{
  "total_projects": 12,
  "total_tasks": 348,
  "members": 8,
  "tasks_by_status": { "open": 45, "in_progress": 23, "done": 280 },
  "overdue_tasks": 7,
  "tasks_due_today": 12,
  "completion_rate": 0.804
}
```

#### GET /api/reports/expenses
#### GET /api/reports/procurement
#### GET /api/reports/inventory
```json
// Each returns summary data for their respective KPI cards
// Exact shape depends on backend implementation
```

#### GET /api/reports/pipeline
#### GET /api/reports/revenue
#### GET /api/reports/win-loss
#### GET /api/reports/lead-sources
#### GET /api/reports/funnel
#### GET /api/reports/churn-risk
#### GET /api/reports/clv
#### GET /api/reports/cohort
```json
// CRM report data — displayed in widget form on dashboard if CRM module is active
// Each returns a summary object (backend may paginate or aggregate)
```

#### GET /api/onboarding/status
```json
{ "completed": false, "steps": ["profile", "workspace_setup", "invite_team", "feature_tour", "preferences"] }
```

#### GET /api/workspaces/{id}/items (from boards)
Used in My Tasks quick-view — fetches items assigned to current user across all boards.

#### GET /api/settings/notification-preferences (for daily goals progress)

### Real-time Events (Socket.IO)

```typescript
socket.on('item:updated', (data: { boardId, itemId, changes }) => {
  // Refresh My Tasks widget if the updated item is assigned to current user
  // Update KPI card counts
});
socket.on('notification:new', (data) => {
  // Increment unread count, prepend to activity feed
});
socket.on('board:updated', (data) => {
  // Refresh recent boards list
});
```

---

## Component Tree

```
<DashboardPage>
  <PageHeader>
    <WelcomeMessage>
      <Heading>Good morning, {user.name.split(' ')[0]} 👋</Heading>
      <Text variant="muted">{formatDate(new Date(), 'EEEE, MMMM do')}</Text>
    </WelcomeMessage>

    <OnboardingPrompt>  ← conditionally rendered if !onboarding.completed
      <Card variant="subtle">
        <Text>Complete your workspace setup</Text>
        <ProgressBar value={onboardingProgress} />
        <Button size="sm" onClick={() => navigate('/onboarding')}>Continue setup</Button>
        <Button variant="ghost" size="sm" onClick={dismissOnboarding}>Dismiss</Button>
      </Card>
    </OnboardingPrompt>
  </PageHeader>

  <QuickStatsRow>  ← horizontal scroll on mobile
    <KpiCard title="Open tasks" value={dashboard.open_tasks} trend={trend.up} />
    <KpiCard title="Overdue" value={dashboard.overdue_tasks} trend={trend.down} variant="danger" />
    <KpiCard title="Upcoming meetings" value={upcomingMeetings.length} />
    <KpiCard title="Unread notifications" value={unreadCount} variant="warning" />
  </QuickStatsRow>

  <QuickActionsRow>
    <QuickActionButton icon={Board} label="New Board" onClick={openBoardCreate} />
    <QuickActionButton icon={Meeting} label="New Meeting" onClick={openMeetingCreate} />
    <QuickActionButton icon={Document} label="New Document" onClick={openDocCreate} />
    <QuickActionButton icon={Task} label="New Task" onClick={openTaskCreate} />
  </QuickActionsRow>

  <DashboardGrid>
    <DashboardWidget span={2}>  ← spans 2 columns
      <WidgetHeader title="Recent activity" icon={Activity}>
        <FilterDropdown options={['All', 'Mentions', 'Updates', 'System']} />
      </WidgetHeader>
      <ActivityFeed />  ← real-time, scrollable, max 20 items
    </DashboardWidget>

    <DashboardWidget span={1}>
      <WidgetHeader title="My Tasks" icon={Checklist}>
        <Link to="/my-day">View all</Link>
      </WidgetHeader>
      <MyTaskList />  ← grouped by status, max 10 items
    </DashboardWidget>

    <DashboardWidget span={1}>
      <WidgetHeader title="Upcoming meetings" icon={Calendar}>
        <Link to="/meetings">View all</Link>
      </WidgetHeader>
      <UpcomingMeetings />  ← next 5 meetings
    </DashboardWidget>

    <DashboardWidget span={1}>
      <WidgetHeader title="Daily progress" icon={Target}>
        <Text variant="muted">3 of 5 tasks done</Text>
      </WidgetHeader>
      <DailyProgressRing value={60} />
      <TaskChecklist>
        <TaskItem checked={true} label="Review PR #234" />
        <TaskItem checked={true} label="Update dashboard spec" />
        <TaskItem checked={false} label="Deploy to staging" />
        <TaskItem checked={false} label="Team sync at 3pm" />
        <TaskItem checked={false} label="Push release notes" />
      </TaskChecklist>
    </DashboardWidget>

    <DashboardWidget span={1}>
      <WidgetHeader title="Recent boards" icon={Board}>
        <Link to="/boards">All boards</Link>
      </WidgetHeader>
      <RecentBoards boards={boards} />
    </DashboardWidget>

    <DashboardWidget span={2}>
      <WidgetHeader title="Team activity" icon={Users}>
        <DateRangeFilter />
      </WidgetHeader>
      <TeamActivityChart data={reports} />  ← bar/line chart of items completed over time
    </DashboardWidget>

    {/* CRM widgets — conditionally rendered if user has CRM data */}
    {hasCRM && (
      <>
        <DashboardWidget span={1}>
          <WidgetHeader title="Pipeline" icon={Pipeline}>
            <Link to="/crm/pipeline">Details</Link>
          </WidgetHeader>
          <PipelineSummary data={reports.pipeline} />
        </DashboardWidget>
        <DashboardWidget span={1}>
          <WidgetHeader title="Revenue" icon={Revenue}>
            <Link to="/crm/reports">Details</Link>
          </WidgetHeader>
          <RevenueSummary data={reports.revenue} />
        </DashboardWidget>
      </>
    )}
  </DashboardGrid>
</DashboardPage>
```

---

## UI States

### Loading State

Every widget loads independently. The page skeleton renders empty widget frames with shimmer:

```
<DashboardPage>
  <PageHeader>
    <Skeleton width="280px" height="36px" />
    <Skeleton width="200px" height="20px" className="mt-1" />
  </PageHeader>

  <QuickStatsRow>
    {Array.from({ length: 4 }).map((_, i) => (
      <KpiCardSkeleton key={i} />
    ))}
  </QuickStatsRow>

  <QuickActionsRow>
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} width="150px" height="48px" radius="md" />
    ))}
  </QuickActionsRow>

  <DashboardGrid>
    <Skeleton width="66%" height="320px" />
    <Skeleton width="33%" height="320px" />
    <Skeleton width="33%" height="240px" />
    <Skeleton width="33%" height="240px" />
    <Skeleton width="33%" height="240px" />
  </DashboardGrid>
</DashboardPage>
```

Each widget skeleton is the EXACT size of the real widget. No layout shift when content loads. Widgets use `useQuery` with `suspense: false` — they individually show skeleton until their data resolves. The 4 KPI cards share one `useQuery(['dashboard'])` so they load together.

### Empty State

When `GET /api/reports/dashboard` returns zero counts or no boards/projects:

```
<DashboardPage>
  <EmptyState>
    <Illustration variant="workspace-empty" />
    <Heading>Your workspace is ready</Heading>
    <Text>Start by creating your first board or task. Invite your team to collaborate.</Text>
    <div className="flex gap-3">
      <Button icon={Plus} onClick={openBoardCreate}>Create your first board</Button>
      <Button variant="secondary" icon={User} onClick={openInviteModal}>Invite team members</Button>
    </div>
  </EmptyState>
</DashboardPage>
```

The KPI cards show `--` instead of 0. The activity feed shows "No recent activity." My Tasks shows "No tasks assigned to you."

### Error State

Each widget has its own error boundary:

```
function ActivityFeedError() {
  return (
    <WidgetError onRetry={refetchActivity}>
      <Text>Failed to load activity</Text>
      <Button size="sm" variant="secondary" onClick={refetchActivity}>Retry</Button>
    </WidgetError>
  );
}
```

If ALL widgets fail (e.g., network down), we show a full-page error card. If one widget fails, only that widget shows the error — the rest continue rendering.

### Edge Cases

| Condition | UX |
|-----------|----|
| User has tasks in 20+ boards | My Tasks widget shows top 10, grouped by status. Full list in /my-day. |
| 500+ unread notifications | KPI card shows "99+". Activity feed shows "You have 500+ unread notifications. Mark all as read?" with action button. |
| No upcoming meetings | Widget shows "No meetings scheduled" with "Schedule one" link. |
| Completed onboarding | OnboardingPrompt does NOT render at all (not hidden, not rendered). |
| Workspace with 0 members (edge case from registration before invite) | QuickStatsRow shows member count as 1 (self). Empty state shows invite option. |
| Real-time update floods (>1 per second) | Activity feed debounces UI updates. Socket.IO events are queued and rendered in batches every 500ms max. |
| User has no role-based access to CRM | CRM widgets are not rendered. The `usePermissions().can.viewReports` gate wraps the CRM section. |
| Dashboard data takes >5s to load | Show skeleton for 3s, then show "Still loading..." text on the loading widgets. After 10s, show per-widget error with retry. |
| KPI trend data missing (first day) | Trend arrow shows "—" instead of up/down. No trend is better than a misleading flat trend. |

---

## Interaction Design

### KPI Cards

- Hover: subtle scale-up (transform: scale(1.02)), shadow elevation increases
- Click: navigates to relevant filtered view (e.g., "Open tasks" card → `/boards?filter=open`)
- Trend arrow: green up = improvement, red down = regression. For "overdue," red up = bad (more overdue). Color is semantically mapped per metric.
- Value is animated on first load: counts up from 0 to target value over 800ms (CSS counter animation, not JS).

### Quick Action Buttons

Each opens a modal/dialog:
- New Board: Dialog with board name, type (Kanban/Table/Timeline), team select. On create → POST /api/workspaces/{id}/boards → navigate to new board.
- New Meeting: Dialog with title, date/time, attendees. On create → navigate to meetings page.
- New Document: Opens rich text editor in new document.
- New Task: Quick inline form (small dialog) — title, assignee, due date, board select. On create → POST /api/workspaces/{id}/boards/{boardId}/items.

### Activity Feed

Chronological list (newest first) with infinite scroll (load 20, load more on scroll to bottom). Each item has:
- Icon based on type (mention=@, update=pencil, system=gear)
- Actor avatar + name
- Timestamp (relative: "2m ago", "1h ago", "Yesterday")
- Click navigates to the relevant entity

Real-time items animate in from top with a slide-down + fade. New items trigger a subtle "N new items" bar at the top if user has scrolled down.

### My Tasks

```
<div className="space-y-1">
  <TaskGroup label="To Do">
    <TaskRow task={task} onClick={() => navigateToItem(task)} />
  </TaskGroup>
  <TaskGroup label="In Progress">
    <TaskRow task={task} onClick={() => navigateToItem(task)} />
  </TaskGroup>
  <TaskGroup label="Done">
    <TaskRow task={task} onClick={() => navigateToItem(task)} />
  </TaskGroup>
</div>
```

Clicking a task navigates to the item detail view within its board. Task row shows: checkbox (optimistic toggle), title, assignee avatar, priority badge, due date (red if overdue).

### Daily Progress

Circular progress ring (SVG, not canvas — 2KB vs 20KB). Shows percentage of daily goals completed. Click navigates to /my-day.

### Team Activity Chart

Renders an SVG line/bar chart using a lightweight custom component (no recharts/chart.js — they're 50KB+). We render SVG `<polyline>` directly from data points. If CRM data is available, chart shows pipeline stages or revenue trends.

### DatePicker (for meeting filtering)

Uses a lightweight date-picker primitive built on `@radix-ui/react-popover`. No full calendar library on the dashboard. Only day selection with quick presets (Today, This Week, This Month).

---

## Data Flow

```
DashboardPage mounts
  │
  ├─ useQuery(['dashboard']) → GET /api/reports/dashboard
  │   └─ KPI cards, daily progress, team activity chart
  │
  ├─ useQuery(['boards', workspaceId], { staleTime: 60000 }) → GET /api/workspaces/{id}/boards
  │   └─ Recent boards widget (top 5 by updated_at)
  │
  ├─ useQuery(['notifications', workspaceId]) → GET /api/workspaces/{id}/notifications
  │   └─ Unread count for KPI card + activity feed
  │
  ├─ useQuery(['my-tasks', workspaceId]) → aggregated items assigned to current user
  │   └─ My Tasks widget
  │   └─ Implementation: GET each board's items, filter by assignee
  │       └─ Optimize: if backend supports /api/items?assigned_to=me, use that instead
  │
  ├─ useQuery(['onboarding']) → GET /api/onboarding/status
  │   └─ Onboarding prompt conditional render
  │
  ├─ useQuery(['meetings']) → GET /api/workspaces/{id}/meetings
  │   └─ Upcoming meetings widget
  │
  ├─ useQuery(['reports', 'crm']) → GET /api/reports/pipeline (and others)
  │   └─ CRM widgets (conditional on permissions + data existence)
  │
  └─ Socket.IO connection
      └─ item:updated → invalidate ['dashboard'] + ['my-tasks']
      └─ notification:new → invalidate ['notifications']
      └─ board:updated → invalidate ['boards']
```

Widgets re-fetch individually when their query key is invalidated. No cascade invalidations. Socket.IO events invalidate only the affected query keys.

---

## Widget Composition Pattern

```typescript
// src/components/dashboard/DashboardWidget.tsx
interface DashboardWidgetProps {
  title: string;
  icon: React.ComponentType;
  span?: 1 | 2;  // grid column span
  children: React.ReactNode;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

// Usage — each widget is self-contained
function RecentActivityWidget() {
  const { data, isLoading, error, refetch } = useQuery(['activity', workspaceId], fetchActivity);
  return (
    <DashboardWidget title="Recent activity" icon={ActivityIcon} loading={isLoading} error={error} onRetry={refetch}>
      <ActivityFeed items={data?.items ?? []} />
    </DashboardWidget>
  );
}
```

This pattern ensures:
- Every widget manages its own loading/error state
- No parent orchestrator needed (no prop drilling of loading states)
- Widgets can be independently reordered/removed
- Error boundaries wrap each `<DashboardWidget>`, not the content inside

---

## Performance Considerations

1. **Dashboard queries fire in parallel.** TanStack Query's `useQueries` fires all widget queries simultaneously. Total dashboard load time = max(query times), not sum.

2. **KPI card count animation is CSS-only.** We use CSS `@property` + `animation` to animate the counter. No `setInterval`, no `requestAnimationFrame` loop. This costs 0 JS overhead.

3. **Activity feed is virtualized if >50 items.** We use `react-virtuoso` for the feed list. Without virtualization, 100+ activity items cause DOM bloat and slow re-renders on every socket event.

4. **Recent boards widget uses `staleTime: 60000`.** Boards don't change every second. A 60-second stale time prevents refetch on every dashboard remount.

5. **Chart rendering avoids canvas/WebGL.** The team activity chart is an SVG polyline with ~50 data points. SVG at this scale outperforms canvas (no need to manage a rendering context, simpler DOM diff). If data exceeds 500 points, switch to a canvas-based renderer.

6. **Socket.IO events are batched** on the client side. The socket event handler queues updates and flushes them in a `requestAnimationFrame` callback. This prevents 60 re-renders per second when multiple items update simultaneously.

7. **CSS grid for dashboard layout** (not flexbox). Grid allows natural span-based sizing (`grid-column: span 2`) without nested flex containers. Layout shifts on widget load/unload are contained by the grid cell.

8. **Widget-level code splitting.** `React.lazy` is used at the widget level, not the page level. The dashboard page shell renders immediately with skeletons. Each widget's JS chunk loads in parallel:

```
/chunk-dashboard.js          — DashboardPage shell, KpiCard, QuickActions
/chunk-dashboard-activity.js — ActivityFeed component + socket handler
/chunk-dashboard-chart.js    — TeamActivityChart SVG renderer
/chunk-dashboard-crm.js      — CRM widgets (only loaded if hasCRM)
```

---

## Brutal Notes

1. **The dashboard is the most over-engineered page in every product.** Resist the urge to add 20 widgets. The dashboard above has ~8 widget slots. If a widget doesn't answer "what needs my attention right now?" it doesn't belong here. CRM widgets are behind a feature gate for a reason.

2. **Empty state is not an afterthought.** For a new workspace, the empty state IS the dashboard. It should be beautiful, functional, and get the user to value within 2 clicks. The "Create your first board" and "Invite team members" buttons must be the most visually prominent elements on the page when the workspace is empty.

3. **Do NOT compute dashboard data on the client.** Aggregating item counts, overdue tasks, and status distributions from individual board/items API calls on the frontend is slow and expensive. The `GET /api/reports/dashboard` endpoint exists for exactly this reason. If your dashboard widget is making 5 individual API calls, you're doing it wrong.

4. **My Tasks aggregation is the hardest query to optimize.** Across 10+ boards, each with 100+ items, fetching all items to find the ones assigned to the current user is slow. Push for a backend endpoint `GET /api/items?assigned_to=me` — or accept that the My Tasks widget shows at most 10 items and a "View all" link.

5. **Socket.IO events must not cause layout thrashing.** When a `notification:new` event arrives every 200ms, the activity feed should NOT re-render its entire list. Append the new item to the top, cap the list at 20 items, and remove the oldest. Use `React.memo` on `ActivityFeedItem`.

6. **KPI cards showing "0" for everything is a liar.** If the user just created their workspace, "0 overdue tasks" is true but meaningless. Display "--" (or a skeleton) until at least one data point exists. After that, 0 is meaningful.

7. **The "Daily progress" widget is a gamification gimmick and users will ignore it.** If you ship it, make it opt-in (toggle in settings). Users who don't set daily goals should see a prompt to set their first goal, not an empty ring. If engagement metrics after 2 sprints show <10% usage, remove it.

8. **Widget error boundaries are critical but often forgotten.** Without per-widget error boundaries, a broken activity feed takes down the entire dashboard. The dashboard must survive any single widget failure. Test this by intentionally throwing in each widget's render during QA.

9. **Animations on dashboard load are a performance tax.** The KPI count-up animation is fine (800ms, CSS only). But don't stagger-load widgets with entrance animations (fade-in, slide-up, etc.). The user needs data immediately. Animations that delay data visibility will be removed in the first performance review.

10. **Dashboard data is NOT real-time critical.** The Socket.IO updates for dashboard widgets can tolerate 2-5 seconds of delay. We use `staleTime: 30000` and let the socket handler only invalidate query keys (not update state directly). React Query handles the refetch timing. This prevents the dashboard from re-rendering 50 times per minute.

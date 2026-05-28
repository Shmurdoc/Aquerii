# 16 — My Day & Focus Mode

---

## MyDayPage

### Route

```
/workspaces/{workspaceId}/my-day → MyDayPage
```

### Layout

Single-column vertical layout. Sections stack top-to-bottom with collapsible headers. Full-width container with 800px max-width, centered.

```
┌───────────────────────────────────────────────────┐
│  My Day — Wednesday, May 28              [Focus]  │
│                                                    │
│  ── Overdue ───────────────────────────── (4) ──  │
│  [ ] Fix login timeout           ● High   May 25  │
│  [ ] Deploy API v2.1            ● Urgent  May 26  │
│  [ ] Write release notes                     May 27 │
│  [ ] Review Q1 metrics          ● Medium  May 27  │
│                                                    │
│  ── Today ────────────────────────────── (7) ──  │
│  [x] Sprint standup (done)      09:00 AM          │
│  [ ] Prepare demo environment   ● High            │
│  [ ] Code review PR #142                          │
│  [ ] Meeting: Sprint review     03:00 PM         │
│  [ ] Update board columns                         │
│  [ ] Write test cases           ● Low              │
│  [ ] Submit expense report                        │
│                                                    │
│  ── This Week ────────────────────────── (3) ──  │
│  [ ] Draft Q2 roadmap           ● High  Jun 1     │
│  [ ] Performance audit                  Jun 2     │
│  [ ] Team retro prep                      Jun 3     │
│                                                    │
│  ── Later ──────────────────────────── (2) ──  │
│  [ ] Learn Rust                                  │
│  [ ] Refactor auth module                        │
│                                                    │
│  [+ Add to My Day]                                │
└───────────────────────────────────────────────────┘
```

### Data Source

**BRUTAL CALL-OUT: My Day has ZERO backend support.** There is no user-task relationship endpoint, no pinning API, no daily list, no `user_tasks` table. Every interaction below requires new backend endpoints. The entire MyDayPage is speculative.

The backend needs at minimum:

```
GET    /api/workspaces/{id}/my-day          → list of {task_id, task_data, pinned_date, sort_order}
POST   /api/workspaces/{id}/my-day          → add task (body: {task_id, date?})
DELETE /api/workspaces/{id}/my-day/{taskId} → remove from My Day
PATCH  /api/workspaces/{id}/my-day/reorder  → reorder (body: {task_ids: []})
```

The data model:
```sql
-- Required new table
CREATE TABLE user_day_tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL,
  board_id UUID NOT NULL,     -- denormalized for grouping
  pinned_date DATE,            -- null = "Later"
  sort_order INT,
  completed_at TIMESTAMPTZ,   -- null = not completed
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, task_id)    -- one pin per task per user
);
```

Without this table, My Day is dead. No amount of frontend cleverness can work around a missing database table.

### Component Tree

```
MyDayPage
├── MyDayHeader
│   ├── DateDisplay ("Wednesday, May 28")
│   ├── Greeting ("Good morning, Jane")
│   └── FocusModeButton (toggle focus mode)
├── SectionList
│   ├── DaySection (Overdue)
│   │   ├── SectionHeader (title, count, collapse toggle)
│   │   └── TaskItemList
│   │       └── TaskItem (x N)
│   │           ├── Checkbox (strikethrough on complete)
│   │           ├── Title (click → board page context)
│   │           ├── PriorityBadge (colored: urgent=red, high=orange, med=yellow, low=gray)
│   │           ├── DueDateBadge (relative: "May 25" or "in 2 days")
│   │           ├── SourceChip (board/project name, clickable)
│   │           └── RemoveButton (×, remove from My Day)
│   ├── DaySection (Today)
│   │   └── TaskItemList (same as above)
│   │       └── MeetingTaskItem (special — shows time, no checkbox, click opens meeting)
│   ├── DaySection (This Week)
│   │   └── TaskItemList
│   └── DaySection (Later)
│       └── TaskItemList
├── AddToMyDayBar (bottom — search/autocomplete for tasks)
├── EmptyState (shown when 0 tasks across all sections)
└── MyDaySettingsDrawer
    ├── DailyResetToggle (carry forward incomplete tasks)
    ├── DefaultSectionSelector (which section new tasks go to)
    └── MeetingVisibilityToggle (show/hide meetings in My Day)
```

### Section Behavior

**Overdue**: Tasks with `due_date < today` and `pinned_date` is null or <= today. Grouped by how overdue (1 day, 2-3 days, 1 week+). Red left border on overdue > 3 days.

**Today**: Tasks with `pinned_date = today` OR `due_date = today`. Ordered by priority (urgent → low) then by sort_order. Completed tasks shown at bottom with strikethrough (if "show completed" setting enabled, otherwise hidden).

**This Week**: Tasks with `pinned_date` or `due_date` within the current week (Monday–Sunday). Collapsed by default if count > 5.

**Later**: Tasks with `pinned_date is null` and no `due_date`. Manually added with no deadline.

### Manual Add/Remove from My Day

#### Add Flow

1. Click "+ Add to My Day" bar at bottom → opens task search modal.
2. Search queries `GET /api/workspaces/{id}/search?q=...`, filtered to task type only.
3. Results show: title, board name, due date (if any), priority.
4. Click a result → POST /api/workspaces/{id}/my-day with `{task_id}` → task appears in "Today" section → toast "Added to My Day."
5. **BRUTAL CALL-OUT: If global search doesn't return task results filtered by user-accessible items, this entire add flow is broken. The search API must support scoping to items the user can access.**

#### Remove Flow

- Hover over a task → show × button on right.
- Click × → DELETE /api/workspaces/{id}/my-day/{taskId} → task slides out with animation → toast "Removed from My Day."
- Undo option in toast: "Removed. [Undo]" → re-POST the task.

### Daily Reset

On first load of the day (check `localStorage` for last visit date vs today):

1. Show morning summary modal: "Good morning! You have 8 tasks today. 3 are overdue."
2. **Carry-forward**: Any tasks from yesterday's "Today" section that are incomplete AND not overdue get moved to "Today" again. This is a frontend concern (re-POST with today's date), not a backend cron job.
3. Overdue tasks stay in Overdue.
4. **BRUTAL CALL-OUT: Daily reset requires the frontend to track "last visit date" in localStorage. If the user doesn't visit for 3 days, tasks pile up in Overdue with no mechanism to re-prioritize. A better approach: backend daily cron that auto-carries forward incomplete tasks and updates `pinned_date` to today.**

### Meeting Integration

Meetings with `date = today` appear in the "Today" section as special MeetingTaskItems:

```
[Meeting icon] Sprint Review         03:00 PM   Conference Room B
```
- No checkbox (meetings aren't "complete").
- Click → opens meeting detail drawer (see file 14).
- Time shown prominently. Past meetings grayed out.
- Toggle visibility in MyDaySettingsDrawer.

### Search / Autocomplete for Add

When user clicks "+ Add to My Day":

```
┌──────────────────────────────────────────────┐
│  Add to My Day                                │
├──────────────────────────────────────────────┤
│  [Search tasks across all projects...     🔍] │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 📋 Fix login timeout                   │  │
│  │    Board: Sprint Board   Due: May 25   │  │
│  ├────────────────────────────────────────┤  │
│  │ 📋 Deploy API v2.1                     │  │
│  │    Board: Q2 Release   Due: May 26     │  │
│  ├────────────────────────────────────────┤  │
│  │ 📋 Design mockups                      │  │
│  │    Board: Product Board   No due date  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Showing 12 results                  [Cancel]│
└──────────────────────────────────────────────┘
```
- Debounced search (300ms). Minimum 2 characters.
- Empty search shows recent tasks (from last 7 days).
- No results: "No tasks found. Try a different search."

### Loading State

```
┌───────────────────────────────────────────────────┐
│  [Skeleton header: 2 lines of gray blocks]        │
│                                                    │
│  ── Today ──────────────────────────────────────  │
│  [ ] ████████████████████            ██████       │
│  [ ] ████████████████████████        ██████████   │
│  [ ] ████████                                   │
│                                                    │
│  ── This Week ────────────────────────────────   │
│  [ ] ████████████████                ████         │
│  [ ] ████████████████████████        ████████     │
└───────────────────────────────────────────────────┘
```
- 6 skeleton task rows with shimmer animation.
- Section headers show but counts are skeleton blocks.

### Empty State

```
┌───────────────────────────────────────────────────┐
│            ☀️                                     │
│                                                    │
│         You have a clear day!                      │
│                                                    │
│     Nothing overdue, nothing scheduled.            │
│     Add tasks to My Day to get started.            │
│                                                    │
│  [Add tasks from all projects]                     │
└───────────────────────────────────────────────────┘
```
- Sunny illustration.
- "Add tasks" CTA opens the search modal.

### Error State

- **Load error**: "Could not load your day" + Retry button. Fall back to showing cached version from localStorage if available.
- **Add task error**: Toast "Failed to add task. [Retry]" — task does NOT appear optimistically (to avoid orphan state).
- **Remove task error**: Toast "Failed to remove task. [Retry]" — task reappears if it was optimistically removed.

---

## Focus Mode

### Route (same page, state toggle)

```
/workspaces/{workspaceId}/my-day?focus=true → FocusMode
```

Toggle button in MyDayHeader. Also accessible via keyboard shortcut `Ctrl+Shift+F`.

### Layout

Full-screen overlay. Removes all navigation (sidebar, header, tabs). Pure black or dark gray background (`#0f0f0f`). Centered content.

```
┌───────────────────────────────────────────────────────────┐
│  Focus Mode                    [00:25:12]  [End Focus]   │
│                                                           │
│  ── Today (4 remaining) ─────────────────────────────    │
│                                                           │
│  [ ] Deploy API v2.1                    ● Urgent          │
│  [ ] Code review PR #142              ● High             │
│  [ ] Prepare demo environment         ● High             │
│  [ ] Write test cases                 ● Medium           │
│                                                           │
│  ┌───────────────────────────────────────────────────┐    │
│  │  Current Task: Deploy API v2.1                    │    │
│  │                                                    │    │
│  │  [Start Pomodoro]  [Skip]  [Mark Complete]        │    │
│  └───────────────────────────────────────────────────┘    │
│                                                           │
│  Settings: [Deep Work Window ▼] [Pomodoro: 25/5 ▼]       │
└───────────────────────────────────────────────────────────┘
```

### Components

```
FocusMode (full-screen overlay)
├── FocusHeader
│   ├── Timer (MM:SS, countdown or stopwatch)
│   ├── TaskCount ("3 of 8 remaining")
│   └── EndFocusButton (exit overlay)
├── FocusTaskList
│   ├── FocusTaskItem (x N, simplified — checkbox + title + priority only)
│   └── CurrentTaskHighlight (larger, with action buttons)
├── PomodoroControls
│   ├── StartPauseButton
│   ├── ResetButton
│   └── PhaseIndicator ("Focus" / "Break" / "Long Break")
├── DeepWorkWindowIndicator (shows "In your deep work window: 8AM-12PM")
└── NotificationGuardBanner ("Notifications paused")
```

### Pomodoro Timer

- Default: 25 min focus / 5 min break / 15 min long break (every 4th break).
- Configurable in FocusMode's settings dropdown.
- Timer persists across page navigation (use `localStorage` + `visibilitychange` to track elapsed time even when tab is backgrounded).
- On focus session end: browser notification "Focus session complete! Time for a break."
- On break end: browser notification "Break over! Ready to focus?"
- **No backend API for timer** — this is 100% frontend. Data does not sync across devices. This is acceptable for v1.

### Notification Guard

When Focus Mode is active:
1. All browser notifications from Aquerii are suppressed (frontend `Notification` API calls are dropped).
2. In-app notification badge still increments but no popup/toast appears.
3. Socket events are still received and processed — the guard only blocks UI rendering of notifications.
4. A banner at the top reads: "Notifications paused — Focus Mode active."
5. On exiting Focus Mode, notification count is checked and a summary toast is shown: "You have 3 new notifications while you were focused."

### Deep Work Windows

User-configurable time blocks in settings (stored in `localStorage` for v1):

```typescript
type DeepWorkWindow = {
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  start: string; // "08:00"
  end: string;   // "12:00"
};
```

When inside a deep work window:
- Focus Mode shows a green indicator: "🔒 Deep Work Window — 8:00 AM to 12:00 PM"
- Outside: gray indicator: "⏳ Next Deep Work Window: Tomorrow, 8:00 AM"

**BRUTAL CALL-OUT: Deep work windows are stored client-side only. They don't sync across devices. v2 needs a `GET/PUT /api/users/{id}/focus-settings` endpoint.**

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+F` | Toggle Focus Mode |
| `Space` | Start/Pause Pomodoro |
| `N` | Next task |
| `Shift+N` | Previous task |
| `C` | Mark current task complete |
| `Esc` | End Focus Mode |
| `Ctrl+Shift+D` | Add current task to My Day (from any page) |

---

## CRITIQUE: Missing Backend Features

### 1. My Day Has ZERO Backend Support

This is the biggest gap in the entire frontend design. There is no `user_tasks` or `user_day_tasks` table, no endpoints for pinning, no daily reset logic. Everything is speculative.

**v1 Recommendation:** Ship the frontend with full local-first functionality using IndexedDB/localStorage as the data store. Sync to backend when endpoints exist. The user experience is identical — but data is device-local and lost on cache clear.

**v2 Recommendation:** Implement `user_day_tasks` table + REST endpoints. This is 1-2 weeks of backend work.

### 2. AI Curation is Vaporware Without ML

The superprompt describes: "AI curates your My Day based on priority, deadlines, work patterns, and meeting schedule."

**Reality:** There is no ML pipeline, no user behavior tracking, no priority scoring service. "AI curation" is a static sort by due_date + priority — which is just a SQL `ORDER BY`. That's not AI, it's a query.

**v1:** Manual pinning only. User adds tasks themselves.

**v2:** A `/api/ai/my-day-suggestions` endpoint that returns recommended tasks based on:
- Overdue items across all projects
- High-priority items with approaching deadlines
- Items the user recently interacted with
- Items where the user is the sole assignee

### 3. Focus Mode Notification Guard is Frontend-Only

The notification guard suppresses browser notifications client-side, but cannot suppress email, SMS, or mobile push notifications. If the platform sends notifications via external channels, those will still reach the user during focus time.

**v1:** Document this limitation. "Notification guard applies to in-app and browser notifications only."

---

## BRUTAL CALL-OUTS — Full Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **My Day list** | ❌ No backend | New table `user_day_tasks` + CRUD endpoints needed |
| **Add to My Day** | ❌ No endpoint | POST /api/workspaces/{id}/my-day |
| **Remove from My Day** | ❌ No endpoint | DELETE /api/workspaces/{id}/my-day/{id} |
| **Reorder My Day** | ❌ No endpoint | PATCH reorder endpoint |
| **Task search for add flow** | ⚠️ Depends on search | GET /api/workspaces/{id}/search must return tasks |
| **Daily reset** | ❌ No backend | Frontend-only via localStorage — lossy |
| **AI curation** | ❌ Does not exist | Requires ML pipeline — not a v1 feature |
| **Focus Mode timer** | ✅ Frontend only | No backend needed — localStorage is fine |
| **Notification guard** | ⚠️ Frontend only | Cannot suppress external notifications |
| **Deep work windows** | ❌ No backend | Needs user settings endpoint for cross-device sync |
| **Pomodoro settings** | ✅ Frontend only | localStorage is acceptable |
| **Meeting display in My Day** | ⚠️ Depends on meetings | Blocked until meetings API exists (see file 14) |

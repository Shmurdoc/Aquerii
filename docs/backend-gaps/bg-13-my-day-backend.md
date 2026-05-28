# BG-13: My Day / Focus Mode Backend

**Status:** NOT IMPLEMENTED | **Priority:** P2 | **Complexity:** LOW-MEDIUM

---

## 1. What the Feature Is

A personal task management layer on top of the shared workspace. Each user gets a "My Day" view that collects tasks they've personally pinned, plus auto-populated items (overdue tasks, unassigned tasks, recently-mentioned items). Includes Focus Mode settings for deep work windows — scheduled notification muting and distraction-free time blocks.

This separates "what the team needs done" (shared boards) from "what I'm doing today" (personal commitment device). The backend is the companion to the frontend designed in `bg-16-my-day-focus.md`.

## 2. Why It's Missing

| Reason | Detail |
|--------|--------|
| **No user-task relationship** | The User model exists, the Item model exists, but there is zero join table connecting them besides `item.assignee_id`. A user can't "pin" a task they're not assigned to. My Day fundamentally requires a many-to-many relationship between users and tasks. |
| **No concept of "personal view"** | Everything is workspace-scoped. The entire backend assumes you're looking at a workspace. My Day is cross-workspace — I want to see tasks from all my workspaces in one place. The API architecture doesn't support this. |
| **No date-scoped pinning** | Pin a task to "today" vs. "this week" vs. "someday." This is trivial to build but doesn't exist. The current system only has task due dates, not personal commitment dates. |
| **No notification schedule** | Focus Mode requires muting notifications during deep work windows. The existing notification system is binary (on/off per channel). No schedule, no calendar integration, no per-window configuration. |
| **No auto-population rules** | "Show me my overdue tasks" sounds simple, but we need: cross-workspace querying, deduplication (don't auto-add what I already pinned), configurable limits (don't dump 50 overdue tasks), and carry-over logic for unfinished tasks. |

**Hard truth:** This looks like a simple CRUD feature — and the core (pin/unpin tasks) genuinely is. The complexity comes from the auto-population engine, cross-workspace queries, and Focus Mode notification scheduling. If we scope to just pin/unpin + manual My Day, this is 2 days. Full spec below is 1-2 weeks.

## 3. Full Backend Spec

### 3.1 Data Models

```sql
-- User-task pinning. Links a user to a task item with personal context.
CREATE TABLE user_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    item_id         UUID NOT NULL REFERENCES items(id),
    source          VARCHAR(20) NOT NULL DEFAULT 'manual',  -- 'manual', 'auto_my_day', 'auto_overdue', 'auto_mention'
    pin_date        DATE NOT NULL DEFAULT CURRENT_DATE,      -- the day this task is pinned to
    completed_at    TIMESTAMPTZ,            -- when user marked it done in My Day
    position        INTEGER NOT NULL DEFAULT 0,  -- for drag-reorder within a date
    notes           TEXT,                    -- personal notes (not shared with workspace)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, item_id, pin_date)
);

CREATE INDEX idx_user_tasks_user_date ON user_tasks(user_id, pin_date, position);
CREATE INDEX idx_user_tasks_source ON user_tasks(user_id, source);

-- Focus/deep work windows
CREATE TABLE focus_windows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun, 6=Sat
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    label           VARCHAR(100),           -- "Morning deep work", "Code review block"
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_focus_windows_user ON focus_windows(user_id, active);

-- Per-user My Day preferences
CREATE TABLE my_day_preferences (
    user_id                 UUID PRIMARY KEY REFERENCES users(id),
    auto_populate           BOOLEAN NOT NULL DEFAULT TRUE,
    auto_populate_limit     INTEGER NOT NULL DEFAULT 10,     -- max items to auto-add per day
    carry_over_unfinished   BOOLEAN NOT NULL DEFAULT TRUE,   -- carry unfinished tasks to next day
    default_view            VARCHAR(20) NOT NULL DEFAULT 'day',  -- 'day', 'week', 'all'
    show_completed_tasks    BOOLEAN NOT NULL DEFAULT FALSE,
    include_workspaces      UUID[] DEFAULT '{}',              -- limit to specific workspace IDs
    sort_by                 VARCHAR(20) NOT NULL DEFAULT 'position',  -- 'position', 'due_date', 'priority'
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification mute schedule (for Focus Mode)
CREATE TABLE notification_schedule (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    day_of_week     INTEGER CHECK (day_of_week BETWEEN 0 AND 6),  -- NULL = applies every day
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    mute_all        BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_types   VARCHAR(50)[],       -- types allowed through during mute (e.g., ['@mention', 'deadline'])
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_schedule_user ON notification_schedule(user_id, active);
```

### 3.2 API Endpoints

```yaml
# ── My Day ────────────────────────────────────────────────────

GET /api/my-day
  Query: ?date=2025-01-15&include_completed=false
  Headers: Authorization (determines user from token)
  Response: {
    date: "2025-01-15",
    sections: {
      overdue: [{
        id, item_id, title, workspace_id, workspace_name, list_name,
        due_date, priority, source, position, notes
      }],
      today: [],
      this_week: []
    },
    meta: {
      total_count: number,
      auto_populated_count: number,
      manual_count: number,
      completed_count: number
    }
  }
  Logic:
    1. Fetch all user_tasks WHERE user_id = current_user AND pin_date = date
    2. Join with items to get title, status, due_date, priority
    3. Join with lists to get list_name and workspace_id
    4. Section items into:
       - overdue: items with due_date < today and status NOT IN ('done', 'cancelled')
       - today: items with pin_date = today
       - this_week: items with pin_date IN (today+1 .. end_of_week)
    5. If auto_populate is TRUE, add auto-populated items (see 3.3)
    6. Order by position within each section

POST /api/my-day/items
  Body: { item_id: UUID, pin_date?: DATE (default: today), notes?: string }
  Response: { data: UserTask }
  Logic:
    1. Verify item exists and user has access (via workspace membership)
    2. Check for duplicate (user_id + item_id + pin_date)
    3. Get current max position for this user+date, set position = max + 1
    4. Insert user_task with source = 'manual'
    5. Return created task with full item data joined

DELETE /api/my-day/items/{userTaskId}
  Response: { success: true }
  Logic: DELETE FROM user_tasks WHERE id = :id AND user_id = current_user

PATCH /api/my-day/items/{userTaskId}
  Body: { position?: number, pin_date?: DATE, notes?: string, completed?: boolean }
  Response: { data: UserTask }
  Notes: For drag-reorder (change position), reschedule (change pin_date), complete toggle

PUT /api/my-day/reorder
  Body: { items: [{ id: UUID, position: number }] }
  Response: { success: true }
  Notes: Batch update positions after drag-drop reorder

POST /api/my-day/carry-over
  Headers: Authorization
  Response: { carried_over_count: number, new_tasks: UserTask[] }
  Logic:
    1. Find all user_tasks WHERE user_id = current_user
       AND pin_date = yesterday AND completed_at IS NULL
    2. For each, change pin_date to today
    3. If any are already pinned today (duplicate), skip
    4. Return count of carried-over tasks

POST /api/my-day/items/{userTaskId}/complete
  Response: { data: UserTask }
  Notes: Sets completed_at = NOW(). Task stays visible until next day unless show_completed is on.

# ── My Day Preferences ───────────────────────────────────────

GET /api/my-day/preferences
  Response: { data: MyDayPreferences }

PUT /api/my-day/preferences
  Body: {
    auto_populate?: boolean,
    auto_populate_limit?: number,
    carry_over_unfinished?: boolean,
    default_view?: string,
    show_completed_tasks?: boolean,
    include_workspaces?: UUID[],
    sort_by?: string
  }
  Response: { data: MyDayPreferences }
  Notes: Creates preferences row if it doesn't exist (upsert).

# ── Focus Windows ────────────────────────────────────────────

GET /api/focus-windows
  Response: {
    data: FocusWindow[],
    next_active: {
      label: string,
      start_time: string,  -- today's start
      end_time: string,
      minutes_until: number
    } | null
  }
  Notes: Returns all focus windows for the user. Includes computed next active window.

POST /api/focus-windows
  Body: { day_of_week: number, start_time: string, end_time: string, label?: string }
  Response: { data: FocusWindow }
  Notes: Validates no overlap with existing windows for same day.

PUT /api/focus-windows/{id}
  Body: { day_of_week?: number, start_time?: string, end_time?: string, active?: boolean, label?: string }
  Response: { data: FocusWindow }

DELETE /api/focus-windows/{id}
  Response: { success: true }

# ── User Dashboard (cross-workspace) ─────────────────────────

GET /api/my-day/dashboard
  Response: {
    today_count: number,
    overdue_count: number,
    in_focus_mode: boolean,
    next_focus_window: { label, start_time, end_time, minutes_until },
    workspaces: [{
      id: UUID,
      name: string,
      task_count: number
    }],
    quick_stats: {
      completed_today: number,
      total_pinned: number,
      longest_streak: number  -- consecutive days with My Day tasks
    }
  }
  Notes: Lightweight dashboard summary for the My Day page header/widget.
```

### 3.3 Auto-Population Engine

```python
def auto_populate_my_day(user, date):
    if not user.preferences.auto_populate:
        return []

    prefs = user.preferences
    limit = prefs.auto_populate_limit
    new_tasks = []

    # Source 1: Overdue assigned tasks
    overdue = db.query("""
        SELECT i.* FROM items i
        JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
        WHERE i.assignee_id = :user_id
          AND i.due_date < :today
          AND i.status NOT IN ('done', 'cancelled')
          AND i.id NOT IN (
              SELECT item_id FROM user_tasks
              WHERE user_id = :user_id AND pin_date = :today
          )
        ORDER BY i.due_date ASC
        LIMIT :limit
    """, user_id=user.id, today=date, limit=limit)
    new_tasks.extend([create_user_task(user.id, t.id, 'auto_overdue', date) for t in overdue])

    # Source 2: Recently mentioned (comments mentioning user in last 7 days)
    if len(new_tasks) < limit:
        mentioned = db.query("""
            SELECT DISTINCT i.* FROM items i
            JOIN comments c ON c.item_id = i.id
            WHERE c.body ILIKE '%@' || :user_name || '%'
              AND c.created_at > :seven_days_ago
              AND i.status NOT IN ('done', 'cancelled')
              AND i.id NOT IN (
                  SELECT item_id FROM user_tasks
                  WHERE user_id = :user_id AND pin_date = :today
              )
            LIMIT :remaining
        """, user_id=user.id, user_name=user.name, seven_days_ago=date - 7,
            today=date, remaining=limit - len(new_tasks))
        new_tasks.extend([create_user_task(user.id, t.id, 'auto_mention', date) for t in mentioned])

    # Source 3: High-priority unassigned tasks (in workspaces user belongs to)
    if len(new_tasks) < limit:
        unassigned = db.query("""
            SELECT i.* FROM items i
            JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
            WHERE i.assignee_id IS NULL
              AND i.priority IN ('high', 'critical')
              AND wm.user_id = :user_id
              AND i.status NOT IN ('done', 'cancelled')
              AND i.id NOT IN (
                  SELECT item_id FROM user_tasks
                  WHERE user_id = :user_id AND pin_date = :today
              )
            LIMIT :remaining
        """, user_id=user.id, today=date, remaining=limit - len(new_tasks))
        new_tasks.extend([create_user_task(user.id, t.id, 'auto_my_day', date) for t in unassigned])

    return new_tasks
```

### 3.4 Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `MyDayAutoPopulateJob` | Daily at 05:00 UTC | Runs auto-population for all users with auto_populate enabled |
| `CarryOverJob` | Daily at 03:00 UTC | Carries over unfinished tasks (for users with carry_over_unfinished) |
| `FocusModeNotificationJob` | Continuous | Checks active focus windows every 5 minutes, applies notification mute/unmute |

### 3.5 Notification Schedule Logic

```
At all times:
  1. Get current day_of_week + time
  2. Query notification_schedule WHERE user_id = :user AND active = TRUE
     AND (day_of_week IS NULL OR day_of_week = current_dow)
     AND start_time <= current_time AND end_time > current_time
  3. If match found → user is in Focus Mode
  4. Apply mute: suppress all notifications EXCEPT allowed_types
  5. When window ends → restore normal notification delivery
```

## 4. Frontend Design

### 4.1 My Day Page Layout

```
┌─────────────────────────────────────────────────┐
│ My Day · Wed, Jan 15, 2025        [⚡ Focus ON]  │
├─────────────────────────────────────────────────┤
│ ── Overdue (2) ──                                │
│ ☐ Fix login bug [CRIT] · Due Dec 28          ⋮  │
│   Workspace: Project Alpha · List: Bugs        │
│ ☐ Update API docs · Due Jan 10               ⋮  │
│                                                  │
│ ── Today (4) ──                                   │
│ ☐ Design review for v2.3                     ⋮  │
│ ☐ Write unit tests for auth module           ⋮  │
│ ☐ Team standup notes                         ⋮  │
│ ☐ Prepare Q1 report                          ⋮  │
│                                                  │
│ ── This Week (2) ──                              │
│ ☐ Performance audit · Due Fri               ⋮   │
│ ☐ Security review · Due Fri                 ⋮   │
│                                                  │
│ [+ Add from workspace]                           │
└─────────────────────────────────────────────────┘
```

### 4.2 Add Task Modal

```
┌──────────────────────────────────┐
│ Add to My Day                     │
│                                    │
│ Search tasks...                    │
│ ┌──────────────────────────────┐  │
│ │                              │  │
│ │ Results from all workspaces:  │  │
│ │ ☐ Fix login bug (Alpha)     │  │
│ │ ☐ Update docs (API)         │  │
│ │ ☐ Write tests (Alpha)       │  │
│ │ ...                          │  │
│ └──────────────────────────────┘  │
│                                    │
│ Pin to: [Today ▼]                  │
│                                    │
│  [Add Selected]  [Cancel]          │
└──────────────────────────────────┘
```

### 4.3 Focus Mode Toggle (Header)

```
[⚡ Focus Mode]  →  Active window: 10:00 - 12:00 (Morning Deep Work)

When active:
  🔇 Notifications muted
  🟢 Active indicator in sidebar
  ⏱️ Countdown timer to end of window
  🚫 Edit: window changes locked (can override with "I need focus now")
```

### 4.4 Preferences Modal

```
┌──────────────────────────────────────────────┐
│ My Day Preferences                             │
│                                                 │
│ Auto-populate                                    │
│ [✓] Auto-add tasks to My Day daily              │
│     Max items: [10]                              │
│ [✓] Carry over unfinished tasks                  │
│                                                 │
│ Display                                          │
│ Default view: [Day ●] [Week ○] [All ○]          │
│ [✓] Show completed tasks                        │
│ Sort by: [Position ▼]                           │
│                                                 │
│ Workspaces                                      │
│ Include tasks from:                             │
│ [✓] Project Alpha                               │
│ [✓] API Docs                                    │
│ [ ] Marketing Site                              │
│                                                 │
│  [Save]  [Cancel]                               │
└──────────────────────────────────────────────┘
```

### 4.5 Focus Window Editor

```
┌──────────────────────────────────────────────┐
│ Focus Windows                                  │
│                                                 │
│ ┌─ Monday ──────────────────────────────────┐  │
│ │ [✓] 09:00 - 11:00  Morning deep work   ✕ │  │
│ │ [✓] 14:00 - 15:30  Code review block   ✕ │  │
│ │ [+ Add window]                            │  │
│ └───────────────────────────────────────────┘  │
│ ┌─ Tuesday ─────────────────────────────────┐  │
│ │ [✓] 09:00 - 11:00  Morning deep work   ✕ │  │
│ │ [+ Add window]                            │  │
│ └───────────────────────────────────────────┘  │
│ ...                                             │
│                                                 │
│  [Save]  [Cancel]                               │
└──────────────────────────────────────────────┘
```

### 4.6 States Enumeration

| State | Behavior |
|-------|----------|
| **Empty My Day** | "Your plate is clean! Pin tasks from your workspaces or wait for auto-populate." |
| **First time user** | Onboarding overlay explaining My Day, auto-populate, Focus Mode |
| **All completed** | "🎉 All done! {n} tasks completed today." with confetti animation |
| **Auto-populate limit hit** | Note at bottom: "Showing 10 of {n} auto-populated items. [Show all]" |
| **Focus Mode active** | Entire UI shifts: muted colors, timer in header, notification icon grayed |
| **Carry-over happened** | Toast: "{n} unfinished tasks carried over to today" |
| **Cross-workspace empty** | "You're not a member of any workspace with active tasks." |

### 4.7 Loading & Errors

| Scenario | Handling |
|----------|----------|
| Loading My Day | Section skeleton (3 shimmer cards per section) |
| Focus window load failure | Default to "no windows" with error toast |
| Pin/add API failure | Inline error on the task, retry button |
| Auto-populate failure | Banner: "Auto-populate failed. [Retry]" |

---

**Implementation estimate:** 1-2 weeks (backend: 3-5 days, frontend: 4-7 days)
**Dependencies:** None — this is largely independent of other features
**Risk:** Low. Core CRUD is trivial. Focus Mode notification integration depends on the notification system architecture.

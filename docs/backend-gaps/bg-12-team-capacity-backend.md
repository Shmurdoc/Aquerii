# BG-12: Team Capacity & Workload Backend

**Status:** NOT IMPLEMENTED | **Priority:** P1 | **Complexity:** MEDIUM

---

## 1. What the Feature Is

A workload calculation engine and capacity management system that tracks how many hours each team member has assigned (task hours + meeting hours) vs. their available working hours per day/week. Surfaces over/under-load alerts, skill tracking, and assignment suggestions. Enables managers to answer: "Who has bandwidth today?" without guessing.

This is the backend companion to the frontend designed in `bg-19-team-capacity-dashboard.md` (or wherever the frontend spec lives — the backend can ship independently with API consumers).

## 2. Why It's Missing

| Reason | Detail |
|--------|--------|
| **No task time estimates** | The Items model has no `estimated_hours` or `actual_hours` fields. Without estimates, capacity math is garbage-in-garbage-out. The entire items CRUD was built for kanban boards, not resource management. |
| **No meeting calendar integration** | Meeting hours would need calendar API integration (Google Calendar, Outlook) or manual entry. Neither exists. Without meetings, the "capacity" number is a lie. |
| **Employee model is a stub** | Employees table has: id, name, email, role, workspace_id, created_at, updated_at. That's it. No `weekly_working_hours`, `timezone`, `employment_type` (full-time/part-time), `default_available_hours`. |
| **No concept of "assignment" being load-bearing** | Task assignment is a single user_id on the item. There's no concept of percentage allocation, start/end dates for assignments, or effort tracking. The data model needs fundamental changes. |
| **Skills are completely absent** | No skills table, no proficiency levels, no skill categories. Assignment suggestions based on skills require building a skills taxonomy from scratch. |

**Hard truth:** This looks like a medium-complexity feature, but it reveals massive data model gaps. The calculation engine itself is trivial (< 100 lines). The real work is: adding estimated_hours to items, building a meetings model, extending the employees model, and creating the entire skills subsystem. That's 3-4 weeks of foundation work before you calculate your first capacity number.

## 3. Full Backend Spec

### 3.1 Data Models

```sql
-- Extend employees with capacity fields (ALTER TABLE)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS
    weekly_working_hours   DECIMAL(4,1) NOT NULL DEFAULT 40.0,
    timezone               VARCHAR(50) DEFAULT 'UTC',
    employment_type        VARCHAR(20) NOT NULL DEFAULT 'full_time',  -- 'full_time', 'part_time', 'contractor'
    default_available_hours DECIMAL(4,1) DEFAULT 40.0,
    default_break_hours    DECIMAL(4,1) DEFAULT 1.0;
);

-- Daily capacity snapshot per member
CREATE TABLE member_capacity (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id      UUID NOT NULL REFERENCES workspaces(id),
    user_id           UUID NOT NULL REFERENCES users(id),
    date              DATE NOT NULL,
    total_hours       DECIMAL(5,2) NOT NULL DEFAULT 0,     -- total working hours for the day (from employee settings)
    task_hours        DECIMAL(5,2) NOT NULL DEFAULT 0,     -- hours from assigned tasks with estimates
    meeting_hours     DECIMAL(5,2) NOT NULL DEFAULT 0,     -- hours from meetings/events
    break_hours       DECIMAL(5,2) NOT NULL DEFAULT 0,     -- break time
    available_hours   DECIMAL(5,2) NOT NULL DEFAULT 0,     -- total_hours - task_hours - meeting_hours - break_hours
    utilization_pct   DECIMAL(5,2) NOT NULL DEFAULT 0,     -- (task_hours + meeting_hours) / total_hours * 100
    calculated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id, date)
);

CREATE INDEX idx_capacity_workspace_date ON member_capacity(workspace_id, date);
CREATE INDEX idx_capacity_user_date ON member_capacity(user_id, date);

-- Workload alerts (overloaded/underloaded)
CREATE TABLE workload_alerts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id      UUID NOT NULL REFERENCES workspaces(id),
    user_id           UUID NOT NULL REFERENCES users(id),
    alert_type        VARCHAR(20) NOT NULL,  -- 'overloaded', 'underloaded'
    threshold         DECIMAL(5,2) NOT NULL,  -- e.g., utilization >= 90% = overloaded
    current_value     DECIMAL(5,2) NOT NULL,
    date              DATE NOT NULL,
    message           TEXT NOT NULL,
    dismissed_at      TIMESTAMPTZ,
    dismissed_by      UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workload_alerts_workspace ON workload_alerts(workspace_id, alert_type, dismissed_at);

-- Skills taxonomy
CREATE TABLE skills (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(100) NOT NULL,
    category          VARCHAR(50) NOT NULL,  -- 'technical', 'design', 'management', 'communication', etc.
    description       TEXT,
    workspace_id      UUID REFERENCES workspaces(id),  -- NULL = global skill
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, workspace_id)
);

-- User skill proficiency
CREATE TABLE user_skills (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id),
    skill_id          UUID NOT NULL REFERENCES skills(id),
    proficiency_level INTEGER NOT NULL DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),  -- 1=beginner, 5=expert
    years_experience  DECIMAL(3,1),
    last_used_at      TIMESTAMPTZ,  -- when they last demonstrated this skill
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);

-- Meetings (simplified — for capacity calculation, not full calendar)
CREATE TABLE meetings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id      UUID NOT NULL REFERENCES workspaces(id),
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    date              DATE NOT NULL,
    start_time        TIME NOT NULL,
    end_time          TIME NOT NULL,
    duration_minutes  INTEGER NOT NULL,
    recurring         BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule   TEXT,  -- RFC 5545 RRULE
    created_by        UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meeting attendees (links meetings to users for capacity calc)
CREATE TABLE meeting_attendees (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id),
    required          BOOLEAN NOT NULL DEFAULT TRUE,
    response_status   VARCHAR(20) DEFAULT 'accepted',  -- 'accepted', 'declined', 'tentative', 'pending'
    UNIQUE(meeting_id, user_id)
);
```

### 3.2 API Endpoints

```yaml
# ── Capacity ──────────────────────────────────────────────────

GET /api/workspaces/{workspaceId}/capacity
  Query: ?start_date=2025-01-01&end_date=2025-01-31&user_ids=uuid1,uuid2
  Response: {
    data: MemberCapacity[],
    summary: {
      average_utilization: number,
      total_task_hours: number,
      total_meeting_hours: number,
      overloaded_count: number,
      underloaded_count: number
    }
  }
  Notes: Returns capacity snapshots for all members in the date range.
        If no date range, defaults to current week (Mon-Sun).

GET /api/workspaces/{workspaceId}/capacity/{userId}
  Query: ?start_date=2025-01-01&end_date=2025-01-31
  Response: {
    data: MemberCapacity[],
    member: { id, name, email, weekly_working_hours, employment_type },
    current_week: {
      total_hours: number,
      task_hours: number,
      meeting_hours: number,
      available_hours: number,
      utilization_pct: number
    },
    tasks: [{
      id, title, estimated_hours, due_date, status,
      project_name, list_name
    }]
  }
  Notes: Detailed view for one member. Includes their current task breakdown.

GET /api/workspaces/{workspaceId}/capacity/team-summary
  Response: {
    team_size: number,
    total_capacity_hours: number,
    total_allocated_hours: number,
    total_available_hours: number,
    team_utilization_pct: number,
    overloaded_members: number,
    underloaded_members: number,
    members: [{
      user_id, name, utilization_pct, status: 'overloaded'|'healthy'|'underloaded'
    }]
  }
  Notes: Aggregated team view for dashboard widgets.

POST /api/workspaces/{workspaceId}/capacity/recalculate
  Body: { user_ids?: string[], date_from?: string, date_to?: string }
  Response: { recalculated_count: number, duration_ms: number }
  Logic:
    1. For each member in scope, calculate:
       a. total_hours from employee.weekly_working_hours / 7 (per day)
       b. task_hours: SUM of item.estimated_hours for items assigned to user with
          date in range (using item.due_date or a new assignment_start/end date)
       c. meeting_hours: SUM of meeting.duration_minutes / 60 for meetings where
          user is attendee on that date
       d. break_hours from employee.default_break_hours / 7
       e. available_hours = total_hours - task_hours - meeting_hours - break_hours
       f. utilization_pct = (task_hours + meeting_hours) / total_hours * 100
    2. UPSERT into member_capacity
    3. Generate workload_alerts for outliers
  Notes: Can be run for specific users or date ranges. Full workspace recalc ~5s for 50 users x 30 days.

# ── Workload Alerts ──────────────────────────────────────────

GET /api/workspaces/{workspaceId}/workload-alerts
  Query: ?alert_type=overloaded&dismissed=false&date_from=2025-01-01&limit=50
  Response: { data: WorkloadAlert[], total: number }
  Notes: Undismissed alerts shown by default.

POST /api/workspaces/{workspaceId}/workload-alerts/{id}/dismiss
  Response: { success: true }

POST /api/workspaces/{workspaceId}/workload-alerts/dismiss-all
  Response: { count: number }

# ── Skills ───────────────────────────────────────────────────

GET /api/skills
  Query: ?category=technical&workspace_id=xxx&search=react
  Response: { data: Skill[], total: number }
  Notes: Global skills + workspace-specific skills. Search by name.

POST /api/skills
  Body: { name: string, category: string, description?: string }
  Response: { data: Skill }
  Notes: Creates a workspace-specific skill. Global skills are creation-locked.

# ── User Skills ──────────────────────────────────────────────

GET /api/users/{userId}/skills
  Response: { data: UserSkill[] }
  Notes: Returns skills with full skill object joined.

POST /api/users/{userId}/skills
  Body: { skill_id: string, proficiency_level: number, years_experience?: number }
  Response: { data: UserSkill }

PUT /api/users/{userId}/skills/{skillId}
  Body: { proficiency_level?: number, years_experience?: number }
  Response: { data: UserSkill }

DELETE /api/users/{userId}/skills/{skillId}
  Response: { success: true }

# ── Assignment Suggestions ───────────────────────────────────

GET /api/workspaces/{workspaceId}/assignment-suggestions
  Query: ?task_id=xxx&list_id=yyy
  Response: {
    task: { id, title, estimated_hours, due_date },
    suggestions: [{
      user_id, name, email,
      current_utilization_pct: number,
      available_hours_this_week: number,
      matching_skills: [{ name, proficiency_level }],
      missing_skills: [{ name }],
      score: number,  -- 0-100 composite
      reason: string  -- "Has bandwidth and matching skills"
    }]
  }
  Logic:
    1. Get task's required skills (from a new task_skills table or labels)
    2. Find users with utilization < 80%
    3. Score based on: available_hours (weight 0.4) + skill_match (weight 0.4) + 
       historical_accuracy (weight 0.2 — how often they complete similar tasks)
    4. Return top 5 suggestions sorted by score DESC
  Notes: Requires task_skills or label-based skill inference.

# ── Meetings ─────────────────────────────────────────────────

GET /api/workspaces/{workspaceId}/meetings
  Query: ?date=2025-01-15&user_id=xxx
  Response: { data: Meeting[] }

POST /api/workspaces/{workspaceId}/meetings
  Body: { title, date, start_time, end_time, attendees: [{user_id, required?}] }
  Response: { data: Meeting }

DELETE /api/workspaces/{workspaceId}/meetings/{id}
  Response: { success: true }
```

### 3.3 Capacity Calculation Engine

```python
# Pseudocode for the recalculation engine
def recalculate_capacity(workspace_id, user_ids=None, date_from=None, date_to=None):
    users = get_workspace_members(workspace_id, user_ids)
    if not date_from:
        date_from = monday_of_current_week()
    if not date_to:
        date_to = sunday_of_current_week()

    for user in users:
        daily_hours = user.weekly_working_hours / 7

        for date in date_range(date_from, date_to):
            # Task hours: sum estimates for items assigned to user with active date
            task_hours = db.query("""
                SELECT COALESCE(SUM(estimated_hours), 0)
                FROM items
                WHERE assignee_id = :user_id
                  AND :date BETWEEN COALESCE(assignment_start, :date) AND COALESCE(assignment_end, :date)
                  AND status NOT IN ('done', 'cancelled')
                  AND workspace_id = :workspace_id
            """, user_id=user.id, date=date, workspace_id=workspace_id)

            # Meeting hours: sum durations where user is attendee
            meeting_hours = db.query("""
                SELECT COALESCE(SUM(m.duration_minutes), 0) / 60.0
                FROM meetings m
                JOIN meeting_attendees ma ON ma.meeting_id = m.id
                WHERE ma.user_id = :user_id
                  AND m.date = :date
                  AND ma.response_status IN ('accepted', 'tentative')
            """, user_id=user.id, date=date)

            break_hours = user.default_break_hours / 7
            available = daily_hours - task_hours - meeting_hours - break_hours
            utilization = (task_hours + meeting_hours) / daily_hours * 100 if daily_hours > 0 else 0

            upsert_member_capacity(user.id, date, daily_hours, task_hours,
                                   meeting_hours, break_hours, available, utilization)

            # Generate alerts
            if utilization >= 90:
                create_alert(user.id, 'overloaded', 90, utilization, date,
                    f"{user.name} is at {utilization:.0f}% capacity on {date}")
            elif utilization <= 20 and daily_hours > 0:
                create_alert(user.id, 'underloaded', 20, utilization, date,
                    f"{user.name} is at {utilization:.0f}% capacity on {date}")
```

### 3.4 Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `DailyCapacityRecalc` | Daily at 00:00 UTC | Recalculates next 14 days for all workspace members |
| `AlertCleanupJob` | Daily | Dismisses alerts older than 30 days automatically |
| `MeetingImportJob` | Hourly | Optional: syncs meetings from Google/Outlook calendar API |

## 4. Frontend Design

### 4.1 Capacity Heatmap Grid

```
                              Mon 12  Tue 13  Wed 14  Thu 15  Fri 16
┌──────────────────────────────────────────────────────────────────┐
│ Alice Johnson   ████████  ██████████  ████░░░░  ██████████  ██░░  │
│   (40h/wk)       80%        95% 🔴     40%       100% 🔴    20%  │
├──────────────────────────────────────────────────────────────────┤
│ Bob Smith       ██████░░  ████████  ████████  ██████░░  ████░░  │
│   (32h/wk)       60%        80%        80%        60%        40%  │
├──────────────────────────────────────────────────────────────────┤
│ Carol Lee       ██░░░░░░  ████░░░░  ████████  ██░░░░░░  ░░░░░░  │
│   (40h/wk)       20%        40%        80%        20%         0%  │
└──────────────────────────────────────────────────────────────────┘

  Color: ░░ < 30% (underloaded) · ██ 30-70% (healthy) · ██ 70-90% (busy) · ██ > 90% (overloaded 🔴)
```

### 4.2 Individual Workload Bar

```
Alice Johnson ── 40h/wk ── This Week
┌─────────────────────────────────────────────────┐
│ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────────────────────┤
│ Tasks: 24h │ Meetings: 8h │ Break: 5h │ Avail: 3h │
│ Utilization: 80%                                │
└─────────────────────────────────────────────────┘
```

### 4.3 Alert Banners

```
🔴 OVERLOADED ── Alice Johnson is at 95% on Tue 13  [Dismiss] [View Schedule]
🟡 UNDERLOADED ── Carol Lee is at 20% or below for 3 days  [Dismiss] [Assign Task]
```

### 4.4 Skill Tag Editor (Employee Profile)

```
Skills:
[React ▾✕] [TypeScript ▾✕] [UI Design ▾✕] [Python ▾✕]
[+ Add Skill]

  React ──── ★★★★☆  Expert (5 yr)  [Edit ✎] [Remove ✕]
  TypeScript ─ ★★★☆☆  Intermediate (3 yr)
```

### 4.5 Assignment Suggestion Tooltip

```
Assign to: [▼]
┌─────────────────────────────────────────┐
│ Suggested matches (based on skills + load)│
│ ✓ Bob Smith      40% utilized ★★★ React   │
│   Diana Park     55% utilized ★★ TypeScript│
│                                          │
│ [See all suggestions →]                  │
└─────────────────────────────────────────┘
```

### 4.6 States Enumeration

| State | Behavior |
|-------|----------|
| **No estimates on tasks** | Warning banner: "Capacity data is based on task estimates. {n} tasks are missing estimates." |
| **No meetings configured** | Info banner: "Meeting hours not tracked. Add meetings for accurate capacity." |
| **Employee has no hours set** | "Weekly hours not set for {n} employees. Capacity assumed 40h." |
| **Full data** | Normal heatmap + alerts |
| **Error loading** | Retry button per section |

### 4.7 Loading & Errors

| Scenario | Frontend Behavior |
|----------|-------------------|
| Loading | Skeleton heatmap (gray shimmer rectangles per cell) |
| Recalculation in progress | "Recalculating capacity..." spinner on dashboard |
| Stale data | "Last calculated 6 hours ago. [Recalculate]" |

---

**Implementation estimate:** 3-4 weeks (backend: 2 weeks, data model migrations: 1 week, frontend: 1-2 weeks)
**Dependencies:** Items model extension (estimated_hours), Employee model extension (weekly_working_hours)
**Risk:** If task estimates are inaccurate (and they will be — developers hate estimating), the entire capacity feature produces misleading data. Consider training/education strategy for estimates.

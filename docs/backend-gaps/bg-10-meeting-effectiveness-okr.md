# BG-10: Meeting Effectiveness Scoring + OKR/Goal Cascade

**Status:** NOT IMPLEMENTED  
**Priority:** Low  
**Complexity:** HIGH  
**Dependencies:** Meetings module (for meeting data), Tasks module (for post-meeting task completion), Notifications module (for alerts)

---

## 1. What the Feature Is

Two distinct but related features:

### Meeting Effectiveness
An analytics layer that scores each meeting on effectiveness based on:
- **Calendar load:** How many meetings per week per person? Warning at > 20h/week.
- **Duration vs value:** Long meetings (> 1h) with low attendance or low action-item completion.
- **Attendance rate:** < 70% attendance triggers automatic review.
- **Post-meeting task completion:** % of action items completed within 3 days — the strongest signal of meeting value.
- **Recurrence frequency:** Standing meetings that consistently score low on the above metrics.

### OKR/Goal Cascade
A full Objectives and Key Results hierarchy — Company → Department → Team → Individual — with progress tracking, weight-based scoring, and AI-powered alignment detection.

OKRs are the "why." Meeting effectiveness is the "how efficiently." Together they close the loop between strategy and execution.

## 2. Why It's Missing

**Meeting Effectiveness:**
- **No meeting analytics data model.** Meeting records exist (basic CRUD: title, time, attendees), but there's no post-meeting survey, no action-item tracking linked to meetings, no attendance computation, no calendar data (desktop/phone calendar integration doesn't exist).
- **No action-item tracking.** Tasks can be created in meetings, but there's no `meeting_id` foreign key on tasks, so we can't compute "post-meeting task completion rate."
- **No calendar integration.** The system has no read access to Google Calendar, Outlook, or any calendar provider. "Calendar load" is impossible without this.
- **No feedback loop.** There's no mechanism for attendees to rate meeting effectiveness. The Meetings module is purely logistical (CRUD + RSVP).

**OKR/Goal Cascade:**
- **No hierarchy model.** The system has workspace → project → task. There's no "Objective" entity, no parent-child relationship between objectives, no period-based goal management.
- **No progress tracking.** Project progress exists (completion percentage, task counts), but it's not linked to objectives. There's no way to say "This project contributes 30% to Objective X."
- **No alignment detection.** Objectives are set in isolation. There's no analysis to detect that Team A's objective conflicts with Team B's, or that no one is working on the CEO's top priority.
- **No period management.** Q1, Q2, etc. are not first-class concepts. There's no way to set quarterly objectives, roll over unfinished ones, or compare progress across periods.
- **AI alignment detection is pure vaporware.** It requires NLP comparison of objective descriptions across teams, which needs the NLP infrastructure mentioned in bg-07 plus a semantic similarity model.

## 3. Full Backend Specification

### 3.1 Meeting Effectiveness Models

```csharp
// MeetingEffectiveness — computed score for a single meeting instance
public class MeetingEffectiveness
{
    public Guid Id { get; set; }
    public Guid MeetingId { get; set; }
    public double OverallScore { get; set; }           // 0–100
    public string Factors { get; set; } = string.Empty; // JSON breakdown
    public int AttendeeCount { get; set; }
    public int InvitedCount { get; set; }
    public double AttendanceRate { get; set; }          // 0–1
    public double DurationMinutes { get; set; }
    public int ActionItemsCreated { get; set; }
    public int ActionItemsCompleted { get; set; }
    public double ActionItemCompletionRate { get; set; } // Within 3 days
    public double? AvgRating { get; set; }               // From post-meeting survey
    public int RatingCount { get; set; }
    public DateTime GeneratedAt { get; set; }
}

// MeetingRecommendation — actionable insight for reducing meeting waste
public class MeetingRecommendation
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Type { get; set; } = string.Empty;     // "reduce_frequency", "shorten", "decline", "merge", "cancel"
    public string Description { get; set; } = string.Empty;
    public Guid? MeetingId { get; set; }
    public string Severity { get; set; } = "info";       // "info", "warning", "critical"
    public string? Metrics { get; set; }                  // JSON supporting data
    public string Status { get; set; } = "pending";      // "pending", "dismissed", "actioned"
    public DateTime CreatedAt { get; set; }
    public DateTime? DismissedAt { get; set; }
}

// MeetingRating — attendee feedback on a meeting (1–5 stars)
public class MeetingRating
{
    public Guid Id { get; set; }
    public Guid MeetingId { get; set; }
    public Guid UserId { get; set; }
    public int Rating { get; set; }                       // 1–5
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### 3.2 Meeting Effectiveness Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/analytics/meeting-effectiveness` | Effectiveness scores for meetings (with filters) |
| GET | `/api/analytics/meeting-effectiveness/{id}` | Single meeting effectiveness detail |
| GET | `/api/analytics/meeting-recommendations` | Recommendations for current user |
| POST | `/api/analytics/meeting-recommendations/{id}/dismiss` | Dismiss a recommendation |
| POST | `/api/analytics/meetings/{id}/ratings` | Submit meeting rating |
| GET | `/api/analytics/meetings/{id}/ratings` | Get ratings (aggregate only) |
| GET | `/api/analytics/meetings/effectiveness-summary` | Weekly/monthly summary per user |

**GET /api/analytics/meeting-effectiveness**

Query params: `?from=2026-04-01&to=2026-05-01&userId=uuid`

Response:
```json
{
  "summary": {
    "totalMeetings": 24,
    "averageScore": 67,
    "highEffectiveness": 8,
    "mediumEffectiveness": 10,
    "lowEffectiveness": 6
  },
  "meetings": [
    {
      "meetingId": "uuid",
      "title": "Sprint Planning",
      "overallScore": 42,
      "factors": {
        "attendanceRate": 0.55,
        "actionItemCompletionRate": 0.35,
        "durationMinutes": 90,
        "avgRating": 2.8,
        "recurrenceFrequency": "weekly"
      },
      "severity": "low",
      "recommendation": "Consider reducing frequency to biweekly or shortening to 45 min"
    }
  ],
  "trends": {
    "weeklyAverage": [68, 65, 70, 67],
    "totalMeetingHoursPerWeek": [8.5, 9.2, 7.8, 8.1],
    "attendanceTrend": "stable"
  }
}
```

### 3.3 OKR Models

```csharp
// Period — quarterly or custom timebox for OKRs
public class OkrPeriod
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;          // "Q1 2026", "H2 2026"
    public string Type { get; set; } = "quarterly";           // "quarterly", "monthly", "custom"
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "active";            // "upcoming", "active", "completed"
    public DateTime CreatedAt { get; set; }
}

// Objective — a goal at any level of the hierarchy
public class Objective
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid? PeriodId { get; set; }
    public Guid? ParentId { get; set; }                        // null = top-level (Company)
    public string Level { get; set; } = "company";            // "company", "department", "team", "individual"
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public double Progress { get; set; }                       // 0–100 (auto-calculated from key results)
    public double? Weight { get; set; }                        // For weighted scoring at parent level
    public Guid? OwnerId { get; set; }                         // Responsible person
    public Guid? TeamId { get; set; }
    public string Status { get; set; } = "active";             // "draft", "active", "completed", "cancelled"
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

// KeyResult — measurable outcome under an objective
public class KeyResult
{
    public Guid Id { get; set; }
    public Guid ObjectiveId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = "number";              // "number", "percentage", "currency", "boolean"
    public double TargetValue { get; set; }
    public double CurrentValue { get; set; }
    public string Unit { get; set; } = string.Empty;           // "users", "%", "$", "tasks"
    public double Weight { get; set; } = 1.0;                  // Relative importance within objective
    public string? Description { get; set; }
    public string Status { get; set; } = "active";             // "active", "completed", "cancelled"
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// OkrAlignment — detected or manually created alignment between objectives
public class OkrAlignment
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid FromObjectiveId { get; set; }                   // Lower-level objective
    public Guid ToObjectiveId { get; set; }                     // Higher-level objective
    public string Type { get; set; } = "manual";               // "manual", "auto_detected", "ai_suggested"
    public double? Confidence { get; set; }                     // AI confidence score
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

// OkrCheckIn — periodic progress update (weekly recommended)
public class OkrCheckIn
{
    public Guid Id { get; set; }
    public Guid ObjectiveId { get; set; }
    public Guid UserId { get; set; }
    public string? Comment { get; set; }
    public double? ProgressBefore { get; set; }
    public double? ProgressAfter { get; set; }
    public string? ConfidenceLevel { get; set; }                // "on_track", "at_risk", "off_track"
    public DateTime CreatedAt { get; set; }
}
```

### 3.4 OKR Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/okr/periods` | List OKR periods |
| POST | `/api/okr/periods` | Create new period |
| PUT | `/api/okr/periods/{id}` | Update period |
| GET | `/api/okr/objectives` | List objectives (filterable by period, level, owner, team) |
| POST | `/api/okr/objectives` | Create objective |
| GET | `/api/okr/objectives/{id}` | Get objective with key results |
| PUT | `/api/okr/objectives/{id}` | Update objective |
| DELETE | `/api/okr/objectives/{id}` | Delete objective |
| GET | `/api/okr/objectives/{id}/tree` | Get objective with children (full subtree) |
| GET | `/api/okr/key-results` | List key results |
| POST | `/api/okr/key-results` | Create key result |
| GET | `/api/okr/key-results/{id}` | Get key result |
| PUT | `/api/okr/key-results/{id}` | Update key result (current value, weight) |
| DELETE | `/api/okr/key-results/{id}` | Delete key result |
| GET | `/api/okr/alignment` | Get all alignment edges |
| POST | `/api/okr/alignment` | Create alignment |
| DELETE | `/api/okr/alignment/{id}` | Remove alignment |
| POST | `/api/okr/alignment/detect` | Trigger AI alignment detection |
| GET | `/api/okr/alignment/suggestions` | Get AI alignment suggestions |
| GET | `/api/okr/dashboard` | Dashboard summary (cascade + progress) |
| POST | `/api/okr/check-ins` | Create weekly check-in |
| GET | `/api/okr/check-ins?objectiveId=` | Get check-ins for objective |

**GET /api/okr/objectives/{id}/tree**

Response:
```json
{
  "objective": {
    "id": "uuid",
    "title": "Grow ARR to $10M",
    "level": "company",
    "progress": 65,
    "status": "active",
    "owner": { "id": "uuid", "name": "CEO" }
  },
  "keyResults": [
    { "id": "uuid", "title": "Close 50 new enterprise deals", "currentValue": 32, "targetValue": 50, "unit": "deals", "progress": 64, "weight": 0.6 },
    { "id": "uuid", "title": "Reduce churn to < 5%", "currentValue": 4.2, "targetValue": 5, "unit": "%", "progress": 84, "weight": 0.4 }
  ],
  "children": [
    {
      "objective": {
        "id": "uuid",
        "title": "Enterprise Sales: 30 new accounts",
        "level": "department",
        "progress": 70
      },
      "keyResults": [...],
      "children": [
        {
          "objective": { "title": "North America: 15 accounts", "level": "team", "progress": 80 },
          "keyResults": [...],
          "children": [
            { "objective": { "title": "Close 5 accounts in Q2", "level": "individual", "progress": 60 }, "keyResults": [...] }
          ]
        }
      ]
    }
  ]
}
```

**Progress calculation rules:**
- Objective progress = weighted average of its key result progresses
- Key result progress = `(currentValue / targetValue) * 100` (clamped to 0–100)
- For boolean key results: 0 or 100
- Cascade progress = weighted average of sub-objective progresses
- If no key results exist, objective progress = 0 (draft state)

### 3.5 OKR Controller Outline

```
OkrController
├── Period CRUD (standard)
├── Objective CRUD
│   ├── Create: validate period, level, parent_id hierarchy rules
│   ├── Update: recalculate progress if key results changed
│   └── Delete: cascade-cancel children (soft: mark cancelled, not hard delete)
├── KeyResult CRUD
│   ├── Create: attach to objective, recalculate objective progress
│   ├── Update: if current_value changes, recalculate objective progress
│   └── Delete: recalculate objective progress
├── GetTree()
│   ├── Recursively fetch objective + children + key results
│   └── Return nested structure
├── Alignment CRUD
│   ├── Create: validate no circular alignment
│   └── Delete: log removal
├── DetectAlignment()
│   ├── Fetch all objectives in current period
│   ├── Run NLP similarity on titles + descriptions
│   ├── Detect conflicts (same goal worded differently) and gaps (no objective covering a strategic area)
│   └── Create OkrAlignment with type = "ai_suggested" and confidence
├── GetAlignmentSuggestions()
│   └── Return unconfirmed AI alignments
├── Dashboard()
│   ├── Compute cascade from top-level objectives
│   ├── Per-level progress breakdown
│   ├── Alignment graph data
│   └── Return dashboard summary
└── CheckIns CRUD
    └── Track progress over time with confidence level
```

### 3.6 AI Misalignment Detection Algorithm

```
For each period:
  1. Collect all objectives with status = "active"
  2. For each pair (A, B) where A.Level == B.Level:
     a. Compute semantic similarity between A.Title and B.Title using sentence embeddings
     b. If similarity > 0.8 AND they belong to different parent objectives:
        → Suggest alignment (they're likely working on the same thing)
     c. If similarity > 0.9 AND they belong to the same parent:
        → Suggest merge (duplicate objectives)
  3. For each parent objective P, collect child objectives C1..Cn
     a. Compute combined coverage using keyword extraction
     b. If strategic keywords from P are missing from all children:
        → Flag "coverage gap" (no one is working on this aspect)
  4. Detect misalignment:
     a. Objective A says "increase quality" while Objective B says "ship faster"
     b. Semantic contradiction score > threshold
     c. Flag: "AI detected potential misalignment between these objectives"
```

## 4. Frontend Design

### 4.1 Meeting Effectiveness Dashboard

```
┌──────────────────────────────────────────────────┐
│  Meeting Effectiveness — This Month              │
│                                                  │
│  Overall Score: ████████░░ 67/100               │
│                                                  │
│  ─── Breakdown ───                              │
│  Attendance Rate:     ████████░░ 78%             │
│  Action Item Rate:   ██████░░░░ 62%              │
│  Avg Rating:         ⭐⭐⭐ 3.2/5                │
│  Weekly Load:        ⏰ 8.1h/person              │
│                                                  │
│  ─── Worst Offenders ───                        │
│  🔴 Sprint Planning     Score: 42  ⏰ 90min     │
│     ↓ 55% attendance, 35% action item rate      │
│     💡 "Consider biweekly or 45 min"            │
│                                                  │
│  🟡 Weekly Standup       Score: 58  ⏰ 30min     │
│     ↓ 70% attendance, 50% action item rate      │
│     💡 "Try async standup tool"                  │
│                                                  │
│  ─── Your Meeting Load ───                      │
│  This week: 8.5h in meetings (20 invited)       │
│  Trend: 📈 up 0.5h from last week               │
│  [View Recommendations →]                        │
└──────────────────────────────────────────────────┘
```

### 4.2 Meeting Load Alert Banner

Appears at the top of the calendar view when a user's meeting load exceeds thresholds:

```
┌──────────────────────────────────────────────────────┐
│  ⚠️ You're in 22 hours of meetings this week        │
│  That's 55% of your working time.                    │
│  Recommendations:                                    │
│  ┌────────────────────────────────────────────────┐ │
│  │ ☐ Decline: Team Standup (30min, low score 58) │ │
│  │ ☐ Shorten: Sprint Retro to 45min               │ │
│  │ ☐ Decline: All-hands (FYI only, async OK)      │ │
│  │ [Apply Selected] [Dismiss All]                  │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 4.3 OKR Tree View

Interactive hierarchical visualization:

```
┌───────────────────────────────────────────────────────┐
│  OKR Cascade — Q2 2026                               │
│  [Period: Q2 2026 ▼]  [Level: All ▼]  [Search...]   │
│                                                       │
│  🎯 Company: Grow ARR to $10M           ████████░░ 65%│
│  ├── 📊 Department: Enterprise Sales   ███████░░░ 70% │
│  │   ├── 👥 Team: North America        ████████░░ 80% │
│  │   │   ├── 👤 Alice: Close 5 deals  ██████░░░░ 60% │
│  │   │   └── 👤 Bob: Close 4 deals    ████████░░ 80% │
│  │   └── 👥 Team: Europe              ██████░░░░ 55% │
│  │       └── ...                                       │
│  ├── 📊 Department: Marketing          █████░░░░░ 50% │
│  │   └── ...                                           │
│  └── 📊 Department: Product           ███████░░░ 72%  │
│      └── ...                                           │
│                                                       │
│  ⚠️ AI Detected: "Enterprise Sales" and "Product"    │
│     objectives overlap on "existing customer upsell"  │
│     [View Details] [Dismiss]                          │
└───────────────────────────────────────────────────────┘
```

### 4.4 Key Result Inline Edit

Clicking a key result value opens inline edit:

```
├── 👤 Alice: Close 5 deals  ██████░░░░ 3/5
                                   ↑ click
                                   ↓
├── 👤 Alice: Close 5 deals  ██████░░░░ [3] / 5  ✓
```

Changing current value auto-recalculates parent objective progress.

### 4.5 Alignment Arrows Visualization

Canvas/SVG overlay on the OKR tree showing alignment connections:

```
🎯 Company: Grow ARR
 │
 │  ←—— auto-aligned ———→
 │                         │
📊 Enterprise Sales      📊 Marketing
 │                         │
 │  ←—— ai-suggested ——→   │
 │                         │
👥 North America          👥 Demand Gen
```

Different line styles:
- Solid green: manual alignment
- Dashed blue: auto-detected (same keywords)
- Dotted amber: AI-suggested (needs confirmation)
- Dashed red: AI-detected conflict

### 4.6 What-if Slider for OKR Progress

Similar to bg-08 but simpler:

```
Scenario: If Alice closes 2 more deals...
                           Current │ Projected
Enterprise Sales progress:    70%  │    78% (+8%)
Alice's progress:             60%  │   100% (+40%)
```

### 4.7 UX States

| State | Handling |
|-------|----------|
| No meetings this month | "No meeting data yet. Schedule a meeting to see effectiveness scores." |
| No ratings | "Rate your meetings to improve effectiveness tracking." |
| Calendar not connected | "Connect Google Calendar or Outlook for full meeting load analysis." |
| No OKR period active | "Create a period to get started with OKRs." |
| No objectives in period | Empty state with "Create your first objective" CTA |
| Objective, no key results | "Add key results to track progress toward this objective." |
| AI alignment detection loading | Spinner: "Analyzing objectives for alignment..." |
| AI detection complete | Badge: "3 suggestions found" with list |
| Check-in overdue | Warning on objective: "Check-in overdue. Update progress." |

## 5. Ethical Guardrails

1. **Meeting effectiveness is for self-improvement, not punishment.** Scores are visible to the organizer and attendees only. Managers can see aggregate department data but not individual scores.
2. **OKR progress is transparent but not weaponized.** Individual OKRs are visible to the individual, their manager, and leadership. They are not used for automatic compensation or promotion decisions.
3. **AI alignment suggestions are suggestions only.** They require human confirmation. Never auto-link objectives.
4. **Meeting recommendations respect autonomy.** Users can dismiss recommendations permanently. No automatic calendar changes.
5. **Raters are anonymous.** Meeting ratings never reveal individual rater identity.

---

## 5. Implementation Roadmap

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| 0 | 2 weeks | MeetingEffectiveness + MeetingRating tables + migration |
| 1 | 2 weeks | Meeting effectiveness computation (background job, daily) |
| 2 | 1 week | Meeting recommendations engine |
| 3 | 1 week | Meeting analytics endpoints |
| 4 | 2 weeks | Meeting dashboard frontend |
| A | 2 weeks | OkrPeriod + Objective + KeyResult tables |
| B | 2 weeks | OKR CRUD endpoints + progress calculation |
| C | 2 weeks | OKR tree view frontend |
| D | 1 week | Alignment CRUD + manual alignment UI |
| E | 2 weeks | AI alignment detection (NLP) |
| F | 1 week | Check-in system |
| G | 1 week | OKR dashboard + cascade visualization |

**Total time (parallel tracks): ~6–8 weeks for Meeting Effectiveness, ~10–12 weeks for OKR.**

## 6. Open Questions

- Should meeting effectiveness scores factor in meeting cost? (e.g., "This 1h meeting with 10 people costs $500 in salary")
- Calendar integration: Google Calendar API, Outlook Graph API, or both? This affects scope significantly.
- OKR rollover: what happens to unfinished objectives at period end? Auto-carry-forward or archive?
- Should there be a "suggested OKRs" feature based on project data? (AI observes "you've been working on performance optimization" → suggests "Improve system response time by 20%")
- How deep should the OKR hierarchy go? Company → Department → Team → Individual is 4 levels. Should teams be able to add more levels?
- OKR + Scrum: should sprint goals automatically link to key results?

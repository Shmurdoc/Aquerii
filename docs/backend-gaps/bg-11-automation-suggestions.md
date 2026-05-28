# BG-11: AI Automation Suggestions (Pattern Detection Engine)

**Status:** NOT IMPLEMENTED | **Priority:** P1 | **Complexity:** HIGH

---

## 1. What the Feature Is

An AI/statistical pattern detection engine that observes user actions across the workspace — task moves, status changes, reassignments, comment patterns — and recommends automation rules. Instead of requiring users to manually build automation rules from scratch, the system surfaces pre-built suggestions with confidence scores, frequency data, and one-click rule creation.

Analogy: GitHub Copilot for automations. The system watches what you do, notices you always move "Bug" tasks to "In Progress" → "Review" → "Done", and suggests an automation rule for it.

## 2. Why It's Missing

| Reason | Detail |
|--------|--------|
| **Cold start problem** | Pattern detection requires weeks of usage data before producing anything useful. First 2-4 weeks = zero suggestions, which looks like the feature is broken. Engineering teams don't want to ship something that's invisible for a month. |
| **No usage analytics infra** | The automation engine exists but has no instrumentation. There's no event bus recording "who did what to which task when." The entire pattern detection pipeline would need to be built from scratch — event capture, storage, aggregation, sequence analysis. |
| **False positive risk** | Bad suggestions erode trust. If the system suggests "when a task is created, assign it to Alice" because Alice happens to get a lot of new tasks, users learn to ignore suggestions. Getting confidence scoring right is hard. |
| **No ML pipeline** | We have no ML serving infrastructure, no model registry, no feature store. Even simple frequency-based heuristics need a batch processing job, cron scheduler, and deduplication logic. |
| **Edge case explosion** | What happens when a user dismisses a suggestion, then does the same pattern again? Re-suggest? Never suggest again? What about workspace-wide patterns vs. user patterns? Each choice adds complexity. |

**Hard truth:** This got deprioritized because the automation rules engine shipped without telemetry. Retrofitting event capture across items, comments, assignments, and status changes is a week of work before the detection engine even starts.

## 3. Full Backend Spec

### 3.1 Data Models

```sql
-- Records an observed user action for pattern analysis
CREATE TABLE user_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    event_type      VARCHAR(50) NOT NULL,  -- 'task.status_changed', 'task.assigned', 'task.created', 'comment.added'
    entity_type     VARCHAR(50) NOT NULL,  -- 'item', 'comment'
    entity_id       UUID NOT NULL,
    old_value       JSONB,                  -- previous state (nullable)
    new_value       JSONB,                  -- new state
    metadata        JSONB,                  -- extra context (list_id, project_id, etc.)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_events_workspace ON user_events(workspace_id, created_at);
CREATE INDEX idx_user_events_type ON user_events(workspace_id, event_type);

-- Aggregated pattern discovered by the detection engine
CREATE TABLE observed_patterns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    trigger_type    VARCHAR(50) NOT NULL,  -- 'status_changed', 'assigned'
    trigger_config  JSONB NOT NULL,         -- e.g., {"from": "Backlog", "to": "In Progress"}
    action_type     VARCHAR(50) NOT NULL,   -- 'change_status', 'assign', 'add_label'
    action_config   JSONB NOT NULL,         -- e.g., {"status": "In Progress"}
    frequency       INTEGER NOT NULL DEFAULT 0,  -- times observed
    unique_users    INTEGER NOT NULL DEFAULT 0,  -- distinct users doing this pattern
    confidence      DECIMAL(5,2) NOT NULL DEFAULT 0.00,  -- 0.00 - 1.00
    suggested_rule_id UUID REFERENCES automation_rules(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'dismissed', 'expired'
    first_observed  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_observed   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_observed_patterns_workspace ON observed_patterns(workspace_id, status);

-- User-facing suggestion with metadata
CREATE TABLE automation_suggestions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id),
    pattern_id          UUID REFERENCES observed_patterns(id),
    trigger_config      JSONB NOT NULL,
    action_config       JSONB NOT NULL,
    frequency           INTEGER NOT NULL DEFAULT 0,
    confidence          DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    description         TEXT NOT NULL,       -- human-readable: "Move tasks to 'In Progress' when status changes from 'Backlog'"
    category            VARCHAR(30) NOT NULL DEFAULT 'general',  -- 'general', 'status_flow', 'assignment', 'labeling'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dismissed_at        TIMESTAMPTZ,
    dismissed_by        UUID REFERENCES users(id),
    accepted_at         TIMESTAMPTZ,
    accepted_by         UUID REFERENCES users(id)
);

CREATE INDEX idx_suggestions_workspace ON automation_suggestions(workspace_id, created_at DESC);
```

### 3.2 Pattern Detection Engine

The engine runs as a background job (scheduled or event-triggered):

**Phase 1 — Frequency Analysis (Daily batch):**
```
1. SELECT all user_events from last N days
2. Group by (trigger_type, action_type, trigger_config, action_config)
3. Count frequency, unique_users
4. Threshold: frequency >= 5 AND unique_users >= 2 → candidate pattern
5. Calculate confidence = min(frequency / 20, 1.0) * min(unique_users / 5, 1.0)
6. UPSERT into observed_patterns
```

**Phase 2 — Sequence Detection (Event-driven):**
```
1. Watch for 2+ step sequences (e.g., status A→B→C within 60s)
2. Common sequence: Task Created → Assigned to [user] → Status changed to "In Progress"
3. Create compound suggestions: "When task is created, assign to {most_common_user} and move to In Progress"
```

**Phase 3 — Deduplication & Existing Rule Check:**
```
1. For each candidate, check if an identical automation_rule already exists
2. If exists → mark pattern as 'accepted' (silent)
3. Check if pattern was already dismissed → skip (unless re-occurrence threshold exceeded)
```

### 3.3 API Endpoints

```yaml
GET /api/automation-suggestions
  Query: ?workspace_id=xxx&status=pending&category=status_flow&limit=20&offset=0
  Response: { data: AutomationSuggestion[], total: number, meta: { cold_start: boolean, days_of_data: number } }
  Notes: Returns pending suggestions sorted by confidence DESC. Meta includes cold_start flag.

POST /api/automation-suggestions/{id}/accept
  Body: { customize?: { trigger_config?: {}, action_config?: {} } }
  Response: { suggestion: AutomationSuggestion, rule: AutomationRule }
  Logic:
    1. Create automation_rule from suggestion's trigger_config + action_config
    2. Set automation_rule.source = 'suggestion'
    3. Update suggestion: status = 'accepted', accepted_at = NOW(), suggested_rule_id = rule.id
    4. Update observed_pattern: status = 'accepted', suggested_rule_id = rule.id
    5. Return created rule

POST /api/automation-suggestions/{id}/dismiss
  Body: { reason?: string }
  Response: { success: true }
  Logic:
    1. Update suggestion: status = 'dismissed', dismissed_at = NOW(), dismissed_by = current_user
    2. Update observed_pattern: status = 'dismissed'
    3. If reason provided, store for analytics

POST /api/automation-suggestions/dismiss-all
  Response: { count: number }
  Logic: Bulk dismiss all pending suggestions for current workspace

GET /api/automation-suggestions/stats
  Response: {
    total_suggestions: number,
    accepted_count: number,
    dismissed_count: number,
    acceptance_rate: number,
    top_categories: { category: string, count: number }[],
    cold_start_remaining_days: number
  }

POST /api/events (internal — for plugin/webhook parity)
  Body: { event_type, entity_type, entity_id, old_value, new_value, metadata }
  Response: { success: true }
  Notes: Used by the backend to record user actions. Called internally by items/automation controllers.
```

### 3.4 Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `PatternDetectionJob` | Daily (off-peak) | Runs Phase 1 frequency analysis, creates/updates observed_patterns |
| `SuggestionGenerationJob` | Daily (after detection) | Creates automation_suggestions from high-confidence patterns |
| `SuggestionExpiryJob` | Weekly | Marks suggestions older than 60 days as 'expired' |
| `ColdStartDetectionJob` | On first workspace event | Detects if workspace has < 14 days of data, sets cold_start flag |

### 3.5 Cold Start Strategy

- **Days 0-14:** Show banner: "Automation suggestions are being trained. Check back after {n} more days of usage."
- **Days 14-21:** Low-confidence suggestions only. Show with warning: "Beta suggestion — low confidence."
- **Day 21+:** Full suggestions. Minimum 5 occurrences of pattern before surfacing.

## 4. Frontend Design

### 4.1 Suggestion Banner (Automation Page Header)

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 New Automation Suggestion (3)                     [Dismiss All] │
│ The AI has detected patterns in your workspace that could     │
│ be automated. Review and accept suggestions below.            │
├─────────────────────────────────────────────────────────────┤
│ [View Suggestions →]                                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Badge (Navigation)

```
Automations  [🤖 3]
```

### 4.3 Suggestion Card

```
┌─────────────────────────────────────────────────────────────┐
│ [Status Flow]  Confidence: ████████░░ 82%                    │
│                                                               │
│ When a task status changes from "Backlog" to "In Progress"    │
│ → Automatically move it to "Review" after 3 days              │
│                                                               │
│ Observed 24 times · 6 unique users · Last seen 2h ago         │
│                                                               │
│ ┌──────────┐  ┌──────────┐  ┌──────────────┐                 │
│ │  Accept  │  │ Dismiss  │  │ Customize... │                 │
│ └──────────┘  └──────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

**Frequency Meter (visual):**
```
Usage Frequency: ████████████████░░░░░░░░ 24 of 50 (highest)
```

### 4.4 Customize Modal

```
┌──────────────────────────────────────────────────┐
│ Customize Automation           ×                  │
│                                                    │
│ Trigger: When task status changes                  │
│   From: [Backlog ▼]  To: [In Progress ▼]          │
│                                                    │
│ Action: Move to status                             │
│   Status: [Review ▼]                               │
│   Delay: [3] [days ▼]                              │
│                                                    │
│  [Save as Rule]              [Cancel]              │
└──────────────────────────────────────────────────┘
```

### 4.5 Empty State (Cold Start)

```
┌─────────────────────────────────────────────────────────────┐
│ 🧠 Automation Suggestions                                    │
│                                                               │
│ Suggestions are being trained on your workspace activity.     │
│                                                               │
│ 📊 8 days of data collected · 14 days needed                   │
│ ████████░░░░░░░░░░░░                                          │
│                                                               │
│ Keep using your workspace normally. Suggestions will appear   │
│ automatically once enough patterns are detected.              │
│                                                               │
│ [Learn more about automation suggestions]                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.6 States Enumeration

| State | Behavior |
|-------|----------|
| **Cold start** | Progress bar, estimated days remaining, no suggestion cards |
| **Has suggestions** | Cards sorted by confidence, banner at top |
| **All accepted** | Celebration message: "All suggestions accepted! {n} rules created." |
| **All dismissed** | Banner: "No suggestions right now. Continue working and new suggestions will appear." |
| **Error loading** | Retry button, error toast |
| **Empty after processing** | "No new patterns detected. Check back later." |

### 4.7 Loading Skeleton

```
┌─────────────────────────────────────────────┐
│ ████████████████████████████████████████████  │  shimmer bar
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ ████████████████████░░░░░░░  (skeleton)    │ │
│ │ ████████████████████████████               │ │
│ │ ██████░░░░░░░░░░░░░░░░░░░░░░░░░░          │ │
│ └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 4.8 Error States

| Error | Handling |
|-------|----------|
| **Pattern engine down** | Banner: "Suggestion engine temporarily unavailable. [Retry]" |
| **Event capture lag** | Note on cards: "Based on data from {n} hours ago" |
| **API timeout** | Suggestion section collapses with error message, retry button |

---

**Implementation estimate:** 3-4 weeks (backend: 2 weeks, frontend: 1-2 weeks)
**Dependencies:** bg-01-automation (existing), event capture instrumentation
**Risk:** Cold start delays time-to-value. Consider seeding with template suggestions based on workspace type.

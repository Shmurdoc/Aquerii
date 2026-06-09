# 18 — Automation Studio

---

## AutomationPage

### Route

```
/workspaces/{workspaceId}/automations           → AutomationPage (rule list)
/workspaces/{workspaceId}/automations/new        → AutomationBuilderPage (create)
/workspaces/{workspaceId}/automations/{ruleId}   → AutomationBuilderPage (edit)
/workspaces/{workspaceId}/automations/{ruleId}/runs → AutomationRunHistoryPage
/workspaces/{workspaceId}/automations/templates  → AutomationTemplatesPage
```

### Data Source

The automation engine is **fully implemented in the backend**:

| Endpoint | Method | Status |
|----------|--------|--------|
| /api/automations | GET/POST | ✅ Exists |
| /api/automations/{id} | GET/PUT/DELETE | ✅ Exists |
| /api/automations/{id}/toggle | POST | ✅ Exists |
| /api/automation-templates | GET | ✅ Exists |
| /api/automations/{id}/runs | GET | ✅ Exists |
| /api/automations/{id}/test | POST | ✅ Exists |

This is one of the few features where backend support is strong. The frontend design below assumes the data model matches the API structure.

### Assumed Data Model

```typescript
type AutomationRule = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  template_id: string | null;
  created_by: UserSummary;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  last_run_status: 'success' | 'failed' | null;
  run_count: number;
};

type AutomationTrigger = {
  type: 'task_moved' | 'status_changed' | 'deal_stage_reached' | 'scheduled' | 'item_created' | 'item_updated' | 'comment_added';
  config: Record<string, unknown>;
  // task_moved: { board_id, from_column_id?, to_column_id? }
  // status_changed: { board_id?, from_status?, to_status? }
  // deal_stage_reached: { pipeline_id?, stage_id? }
  // scheduled: { cron_expression: string, timezone: string }
  // item_created: { board_id? }
  // item_updated: { board_id?, field?: string }
  // comment_added: { board_id? }
};

type AutomationCondition = {
  field: string;     // 'priority', 'assignee', 'tags', 'due_date', 'status'
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_set' | 'is_not_set';
  value: string | number | string[];
};

type AutomationAction = {
  type: 'assign' | 'notify' | 'create_task' | 'update_field' | 'webhook' | 'change_status' | 'add_tag' | 'remove_tag';
  config: Record<string, unknown>;
  // assign: { assignee_id: string }
  // notify: { channel: 'in_app' | 'email', user_ids: string[], message: string }
  // create_task: { board_id: string, column_id: string, title_template: string, description_template?: string, priority?: string }
  // update_field: { field: string, value: unknown }
  // webhook: { url: string, method: 'GET' | 'POST', headers?: Record<string, string>, body_template?: string }
  // change_status: { column_id: string }
  // add_tag: { tag: string }
  // remove_tag: { tag: string }
};
```

---

## AutomationPage (Rule List)

### Layout

```
┌───────────────────────────────────────────────────────────┐
│  Automation Studio               [+ New Rule] [Templates] │
│                                                           │
│  [Search rules...                             🔍]        │
│  [All Triggers ▼]  [All Status ▼]  [Sort: Newest ▼]     │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🔄 Move high-priority to Review            ● On   │  │
│  │    When: Task moved to "In Progress"               │  │
│  │    Action: Change status to "Review"               │  │
│  │    Last run: 2h ago ✓  |  147 runs                │  │
│  │    [Test] [Edit] [🗑]                              │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ 🔄 Notify team on bug creation            ○ Off   │  │
│  │    When: Task created with tag "bug"               │  │
│  │    Action: Notify @team in Slack                   │  │
│  │    Last run: Never  |  0 runs                      │  │
│  │    [Test] [Edit] [🗑]                              │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ 🔄 Daily standup reminder                 ● On   │  │
│  │    When: Every weekday at 9:00 AM                  │  │
│  │    Action: Notify all workspace members            │  │
│  │    Last run: Today 9:00 AM ✓  |  45 runs           │  │
│  │    [Test] [Edit] [🗑]                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  Showing 3 of 12 rules                                    │
└───────────────────────────────────────────────────────────┘
```

### Component Tree

```
AutomationPage
├── AutomationHeader (title, New Rule button, Templates link)
├── AutomationSearchAndFilter (search + trigger/status/sort dropdowns)
├── AutomationRuleList
│   └── AutomationRuleCard (x N)
│       ├── RuleToggleSwitch (on/off — POST /api/automations/{id}/toggle)
│       ├── RuleName (click → edit page)
│       ├── RuleSummary ("When: ... Action: ...")
│       ├── RuleStatusLine
│       │   ├── LastRunBadge (relative time + status icon ✓/✗)
│       │   ├── RunCount ("147 runs")
│       │   └── EnabledBadge ("On" green / "Off" gray)
│       └── RuleActions (Test button, Edit button, Delete button)
└── Pagination
```

### Toggle Behavior

- Toggle switch calls `POST /api/automations/{id}/toggle` immediately.
- Optimistic: switch flips immediately. If the API fails, revert with a toast.
- When disabled: the rule card is slightly dimmed (opacity 0.6). The toggle is still clickable to re-enable.
- Tooltip on disabled rule: "Rule is paused. It will not trigger."

### Test Run

The "Test" button on each rule card opens the test run modal:

```
┌────────────────────────────────────────────┐
│  Test: Move high-priority to Review        │
├────────────────────────────────────────────┤
│  Select a test entity:                      │
│                                             │
│  [Search for a task/issue...           🔍]  │
│                                             │
│  Results:                                   │
│  ○ Fix login timeout    (Board: Sprint)    │
│  ● Deploy API v2.1     (Board: Release)   │
│  ○ Write test cases     (Board: QA)        │
│                                             │
│  [Cancel]     [Run Test]                    │
└────────────────────────────────────────────┘
```
- User selects a real entity (task, ticket, deal) to test the rule against.
- Click "Run Test" → POST /api/automations/{id}/test with `{entity_type, entity_id}`.
- Results appear inline:

```
┌────────────────────────────────────────────┐
│  Test Results: ✓ Success                   │
│                                             │
│  Trigger: Task ID #142 matched             │
│  Conditions: Priority "High" ✓             │
│  Actions:                                  │
│    ✓ Assigned to Jane Smith                │
│    ✓ Changed status to "Review"            │
│    ✓ Created task "Follow up on #142"      │
│                                             │
│  Duration: 340ms                            │
│                                             │
│  [Close]  [Apply to real entity]            │
└────────────────────────────────────────────┘
```
- "Apply to real entity" runs the same actions for real — use with caution. Show confirm dialog: "This will actually modify data. Continue?"

---

## AutomationBuilderPage (Rule Builder)

### Layout

Two-column layout: left (conditions config) + right (visual flow preview). On <900px, flow preview stacks below.

```
┌─────────────────────────────────────────────────────────┐
│  ← Rules    Editing: Move high-priority to Review       │
│                                                          │
│  ┌─── Left (config) ────┐ ┌─── Right (preview) ────┐  │
│  │                       │ │                          │  │
│  │  Name: [___________]  │ │   [Task Moved]           │  │
│  │  Desc: [___________]  │ │        │                  │  │
│  │                       │ │        ▼                  │  │
│  │  ── Trigger ──        │ │   [Conditions]            │  │
│  │  [Task Moved ▼]       │ │   Priority = High        │  │
│  │  Board: [Sprint ▼]    │ │        │                  │  │
│  │  From: [Any ▼]        │ │        ▼                  │  │
│  │  To: [In Progress ▼]  │ │   ┌─────────────────┐    │  │
│  │                       │ │   │ Assign to Jane  │    │  │
│  │  ── Conditions ──     │ │   ├─────────────────┤    │  │
│  │  [+ Add Condition]    │ │   │ Change to Review│    │  │
│  │  [Field ▼] [is ▼] [v]│ │   └─────────────────┘    │  │
│  │  Priority = High      │ │                          │  │
│  │                       │ │                          │  │
│  │  ── Actions ──        │ │                          │  │
│  │  [+ Add Action]       │ │                          │  │
│  │  [Assign ▼]           │ │                          │  │
│  │  Assignee: [Jane ▼]   │ │                          │  │
│  │  [Change Status ▼]    │ │                          │  │
│  │  To: [Review ▼]       │ │                          │  │
│  │                       │ │                          │  │
│  │  [Test Rule] [Save]   │ │                          │  │
│  └───────────────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Step-by-Step Form

#### Step 1: Name & Description
- Name: text input, required, max 100 chars.
- Description: textarea, optional, max 500 chars.
- Template: if creating from template, name and description are pre-filled.

#### Step 2: Trigger Configuration
Dropdown for trigger type, then context-sensitive config:

| Trigger Type | Config Fields |
|-------------|---------------|
| Task Moved | Board (dropdown), From Column (dropdown, optional), To Column (dropdown, optional) |
| Status Changed | Board (optional), From Status (optional), To Status (optional) |
| Deal Stage Reached | Pipeline (dropdown), Stage (dropdown) |
| Scheduled | Cron Expression (text + builder helper), Timezone (dropdown) |
| Item Created | Board (optional) |
| Item Updated | Board (optional), Field (optional — trigger only when specific field changes) |
| Comment Added | Board (optional) |

**Cron expression builder:**
- Preset buttons: "Every hour", "Every day at 9 AM", "Every weekday at 9 AM", "Every Monday", "Custom"
- Custom: show a visual builder with dropdowns for minute, hour, day of month, month, day of week.
- Display the cron expression as a human-readable string below: "Runs every weekday at 9:00 AM America/New_York"
- **BRUTAL CALL-OUT: The cron expression field assumes the backend uses standard cron. Verify with backend team. Some automation engines use ISO 8601 recurring intervals instead.**

#### Step 3: Conditions
- Zero or more conditions, all AND-combined (OR support is v2).
- Each condition row: Field dropdown → Operator dropdown → Value input.
- Field options depend on entity type (tasks have different fields than deals).
- Dynamic field list should be fetched from `GET /api/workspaces/{id}/fields` (if such endpoint exists) or hardcoded.
- **BRUTAL CALL-OUT: If the backend doesn't support conditions (i.e., triggers fire unconditionally), the entire conditions UI is decorative. Verify `AutomationCondition` is actually evaluated server-side.**

#### Step 4: Actions
- One or more actions, executed in order.
- Each action: Type dropdown → type-specific config form.

| Action Type | Config Fields |
|------------|---------------|
| Assign | Assignee (user dropdown, single-select) |
| Notify | Channel (in_app / email), Recipients (multi-select users), Message template (text with `{{variables}}`) |
| Create Task | Board (dropdown), Column (dropdown), Title template (text with `{{variables}}`), Description template (optional), Priority (dropdown) |
| Update Field | Field (dropdown), New Value (depends on field type) |
| Webhook | URL (text input), Method (GET/POST dropdown), Headers (key-value pairs, dynamic add), Body template (textarea, JSON with `{{variables}}`) |
| Change Status | Target Column (dropdown — the column/status to set) |
| Add Tag | Tag (text input or autocomplete from existing tags) |
| Remove Tag | Tag (text input or autocomplete) |

**Variable interpolation:** Actions support `{{variables}}` that are replaced at runtime:
- `{{item.title}}`, `{{item.url}}`, `{{item.priority}}`, `{{item.due_date}}`
- `{{trigger.type}}`, `{{trigger.timestamp}}`
- `{{actor.name}}` (who triggered the rule)
- `{{workspace.name}}`

The UI should show available variables in a helper panel next to template inputs.

### Visual Flow Preview

The right panel renders a simplified flow diagram:

```
┌──────────────┐
│  Task Moved  │  (trigger icon + name)
└──────┬───────┘
       │
┌──────▼───────┐
│  Conditions  │  (diamond icon, condition count)
│  2 active    │
└──────┬───────┘
       │
       ├─────────────────────────────┐
       │                             │
┌──────▼──────┐            ┌────────▼────────┐
│ Assign to   │            │ Change to       │
│ Jane        │            │ Review          │
└─────────────┘            └─────────────────┘
```

This is a CSS-only flow diagram — not a drag-and-drop node editor (that's v3). Arrows are CSS borders/transforms. Nodes are divs with icons and labels. The flow updates reactively as the user adds/removes trigger/conditions/actions.

---

## AutomationTemplatesPage

### Layout

```
┌───────────────────────────────────────────────────────────┐
│  Automation Templates                    [← Back to Rules] │
│                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 📋 Move  │ │ 🔔 Notify│ │ 📅 Daily │ │ 🏷️ Tag  │    │
│  │ priority │ │ on bug   │ │ standup  │ │ new tasks│    │
│  │ items    │ │ creation │ │ reminder │ │          │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 🔄 Move high-priority tasks to Review            │    │
│  │    Automatically move high-priority tasks to     │    │
│  │    Review column for immediate attention.        │    │
│  │    Trigger: Task moved → Condition: Priority    │    │
│  │    = High → Action: Change status to Review      │    │
│  │                                   [Use Template]  │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ 🔔 Notify team when a bug is created             │    │
│  │    ...                                            │    │
│  │                                   [Use Template]  │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

- Templates are fetched from `GET /api/automation-templates`.
- Each template shows: name, description, trigger type, actions summary, use count.
- "Use Template" → navigates to `/automations/new?template={templateId}` — pre-fills the builder.
- Template categories: Task Management, Notifications, Scheduling, Housekeeping.

---

## AutomationRunHistoryPage

### Layout

```
┌───────────────────────────────────────────────────────────┐
│  Run History: Move high-priority to Review   [← Back]    │
│                                                           │
│  [All Status ▼]  [Last 7 days ▼]                         │
│                                                           │
│  ┌──────┬──────────┬────────┬──────────┬──────────┬─────┐ │
│  │ #    │ Entity   │ Status │ Trigger  │ Duration │ Log │ │
│  ├──────┼──────────┼────────┼──────────┼──────────┼─────┤ │
│  │ 148  │ Task#201 │ ✓      │ Manual   │ 120ms    │ View│ │
│  │ 147  │ Task#199 │ ✓      │ Auto     │ 95ms     │ View│ │
│  │ 146  │ Task#198 │ ✗      │ Auto     │ 500ms    │ View│ │
│  │ 145  │ Task#197 │ ✓      │ Auto     │ 88ms     │ View│ │
│  │ 144  │ Task#195 │ ⟳      │ Auto     │ -        │ View│ │
│  └──────┴──────────┴────────┴──────────┴──────────┴─────┘ │
│                                                           │
│  Showing 1-20 of 148 runs                    [1] [2] ▶  │
└───────────────────────────────────────────────────────────┘
```

- Status icons: ✓ Success, ✗ Failed, ⟳ Running, ⏸ Skipped (conditions not met).
- "View" opens a detail drawer:
```
┌────────────────────────────────────────────┐
│  Run #146 — Failed                         │
├────────────────────────────────────────────┤
│  Entity: Task #198 "Fix login timeout"     │
│  Trigger: Auto — Task moved to "In Prog"  │
│  Started: May 28, 2026 10:32:15 AM         │
│  Duration: 500ms                           │
│                                            │
│  Steps:                                    │
│  ✓ Condition: Priority = High    15ms     │
│  ✓ Condition: Tags contains "bug"  5ms    │
│  ✓ Action: Assign to Jane Smith    30ms   │
│  ✗ Action: Notify Slack channel   450ms   │
│    Error: Slack webhook returned 401      │
│                                            │
│  [Retry]  [Disable Rule]  [Edit Rule]     │
└────────────────────────────────────────────┘
```

- Retry: re-runs the same rule on the same entity.
- Disable Rule: toggles the rule off.
- Edit Rule: navigates to the builder with this rule loaded.

---

## Loading / Empty / Error States

### Loading

- **Rule list**: 4 skeleton rule cards (toggle placeholder, 3 text lines, button placeholders).
- **Builder**: Skeleton form (6 skeleton field rows on left, skeleton flow diagram on right).
- **Run history**: Table skeleton (8 rows × 5 columns).

### Empty

- **No rules**: "No automation rules yet. Automate repetitive tasks and notifications." + "Create your first rule" CTA.
- **No runs**: "This rule hasn't run yet. Use the Test button to try it out."
- **No templates**: "No templates available." (unlikely — templates are pre-seeded by backend).
- **No search results**: "No rules match your search." Clear search button.

### Error

- **Rule list error**: "Failed to load automation rules" + Retry button.
- **Save error**: Toast "Failed to save rule. [Retry] [Discard]" — do NOT navigate away on save failure.
- **Toggle error**: Toast "Failed to toggle rule — reverting." + switch flips back.
- **Test run error**: Inline error in test modal: "Test failed: [error message]".
- **Delete error**: Toast "Failed to delete rule. [Retry]".

### Form Validation

- Name required (show red border + "Name is required" on blur if empty).
- At least one trigger required. Show inline error on trigger section if empty on save.
- At least one action required. Show inline error if empty on save.
- Webhook URL must be valid HTTP/HTTPS URL. Show format error.
- Cron expression must be valid. Show "Invalid cron expression" with examples.
- Save button disabled until form is valid.

---

## CRITIQUE: Missing Backend Features

### 1. AI-Recommended Automations — Zero Backend Support

The superprompt describes: "AI analyzes workspace patterns and suggests automations. 'I notice you manually move high-priority tasks to Review — create an automation?'"

**Reality:** The backend has no pattern detection, no usage analytics pipeline, no suggestion API. "AI recommendations" is a pure marketing line.

**v1:** Ship manual rule builder only. Users create their own rules from scratch or from templates.

**v2:** A `GET /api/ai/automation-suggestions` endpoint that:
- Analyzes the last 30 days of user actions in the workspace
- Identifies repetitive patterns (same action on same trigger type >5 times/week)
- Returns suggestions with expected impact ("Save 15 minutes/week")
- Frontend shows suggestion cards on the AutomationPage:

```
┌──────────────────────────────────────────────────┐
│  💡 AI Suggestions (2)                           │
│                                                   │
│  [Dismiss] Move high-priority tasks to Review    │
│  I notice you move priority tasks to Review      │
│  manually. Automate this?                       │
│  [Create Rule from Suggestion]                    │
│                                                   │
│  [Dismiss] Notify team when bugs created         │
│  ...                                             │
│  [Create Rule from Suggestion]                    │
└──────────────────────────────────────────────────┘
```

**Estimate for v2:** 3-5 weeks for backend analytics pipeline + suggestion endpoint. The ML is simple (frequency analysis + pattern matching), not deep learning.

### 2. Conditions are AND-Only

The current design assumes all conditions are AND-combined. Power users will want OR logic ("notify if priority is High OR tag is 'urgent'"). The backend may not support OR conditions.

**v1:** AND-only. If backend doesn't support conditions at all, remove the conditions section entirely.

**v2:** Add condition groups (AND/OR nesting). UI: click "Add group" → group selector (AND/OR) → conditions within group.

### 3. Variable Interpolation Depends on Backend

Action templates with `{{variables}}` only work if the backend parses and substitutes them. If the backend treats action config as opaque JSON, template variables are rendered as literal strings "Fix {{item.title}}" — useless.

**Requirement:** Confirm that the automation engine supports variable substitution in action configs. If not, the template UI still works but variables must be resolved to literal values at rule creation time (i.e., user types the task title directly, not `{{item.title}}`).

---

## BRUTAL CALL-OUTS — Full Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **Rule CRUD** | ✅ Full backend | None |
| **Rule enable/disable** | ✅ Full backend | None |
| **Rule list** | ✅ Full backend | None |
| **Templates** | ✅ Full backend | None |
| **Run history** | ✅ Full backend | None |
| **Test execution** | ✅ Full backend | None |
| **Trigger configuration** | ✅ Full backend | Verify all trigger types match backend |
| **Conditions** | ⚠️ Backend capability unknown | Verify conditions are evaluated server-side |
| **Actions** | ✅ Full backend | Verify action types match backend |
| **Variable interpolation** | ⚠️ Unknown | Verify backend substitutes `{{variables}}` in configs |
| **AI-recommended automations** | ❌ Does not exist | Analytics pipeline needed — not a v1 feature |
| **OR condition groups** | ❌ Not designed | AND-only; OR needs backend support |
| **Slack/email notify** | ⚠️ Depends on channel | Verify notify action supports slack and email |
| **Cron expression builder** | ✅ Frontend only | No backend changes needed for UI component |
| **Webhook action** | ⚠️ Unknown | Verify webhook execution works server-side |

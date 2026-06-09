# FlowOS — Complete Feature Specification

**Version**: 1.0  
**Owner**: Product Lead  
**Status**: AUTHORITATIVE

---

## Product 1: FlowOS Boards (Core Work OS)

### 1.1 Boards

**Board Types**:
- **Main Board** — standard task board (default)
- **Sprint Board** — linked to a GitHub repo; shows open PRs, commits, issues
- **CRM Board** — pipeline view for deals/contacts
- **Form Board** — intake board with public-facing form

**Board Settings**:
- Name, description, emoji/icon, cover image
- Visibility: workspace | team | private | public (read-only link)
- Default view (Kanban/Table/Timeline/etc.)
- Color theme
- Custom automation rules
- Board-level permissions (override workspace RBAC)

**Column Types** (custom fields per board):
| Column Type | Description |
|------------|-------------|
| Status | Customizable status labels with colors |
| Text | Short or long text |
| Number | Integer or decimal |
| Date | Single date |
| Date Range | Start + end date |
| Person | Assign to workspace member(s) |
| Multiple Persons | Multi-assign |
| Checkbox | Boolean |
| Dropdown | Single-select from list |
| Multi-Select | Multi-select tags |
| Link | URL with preview |
| File | Upload attachment |
| Formula | Computed from other columns |
| Rating | 1–5 star rating |
| Progress | 0–100% progress bar |
| Location | Address with map pin |
| Phone | Phone number with dial link |
| Email | Email with mailto link |
| Time Tracking | Start/stop timer per item |
| Dependency | Link to another item (blocks/blocked by) |
| Mirror | Mirror value from linked board |
| Votes | Team voting on items |
| Last Updated | Auto-populated timestamp |
| Created By | Auto-populated user |
| Item ID | Auto-generated unique ID |

---

### 1.2 Views

**6 Views (switchable per board, settings remembered per user)**:

#### Kanban View
- Drag-and-drop cards between status columns
- WIP (Work in Progress) limits per column
- Swim lanes (group by any column: person, priority, team)
- Card density: compact / comfortable / expanded
- Card quick-edit (click field to edit inline)
- Color coding by status / priority / person
- Source: `Gemini-Kanban-Pro` + `twenty-main/src/modules/views/`

#### Table View
- Spreadsheet-style editable grid
- Row grouping (by status, person, date, any column)
- Column freeze/pin
- Row-level expand to show subtasks
- Bulk edit (select multiple rows → change field)
- CSV/XLSX export
- Inline filter bar
- Sort by multiple columns
- Source: `InvenTree-master/frontend/src/tables/`

#### Timeline View (Gantt)
- Drag-resize item bars on timeline
- Dependencies (finish-to-start, start-to-start arrows)
- Critical path highlighting
- Baseline comparison (planned vs. actual)
- Zoom levels: day / week / month / quarter / year
- Milestone diamonds
- Resource load overlay
- Source: `Gemini-Kanban-Pro` (Gantt implementation)

#### Calendar View
- Month / week / day layouts
- Items displayed on their due date or date range
- Drag item to new date
- Color by person, status, or priority
- Sync to Google Calendar / Outlook (Pro+)
- Source: `aureuserp-master/plugins/webkul/full-calendar/`

#### Workload View
- Per-person bar chart: tasks + estimated hours
- Shows over/under-allocated team members
- Click member → filter board to their items
- Capacity settings per person (hours/day)
- Source: `YetiForceCRM-developer/modules/OSSTimeControl/`

#### Canvas View (NEW — FlowOS exclusive)
- Full Excalidraw-powered freehand canvas
- Drag tasks from board onto canvas as sticky notes
- Live cursors — see where teammates are on canvas
- Shapes, arrows, text, images
- AI: "Draw a flowchart of this project" → Claude generates diagram
- Source: `excalidraw-master/`

---

### 1.3 Items (Tasks)

**Item Detail Panel** (right-side drawer or full-page):
- Title (rich text with @mentions, #board-links)
- Description (BlockNote block editor — full Notion-like experience)
- Subtasks (nested, unlimited depth)
- Checklist (lightweight todo list within item)
- Assignees (multiple)
- Status + all custom column values
- Due date + reminders
- Time tracking (start/stop timer, manual entry)
- Priority (urgent / high / medium / low)
- Labels / Tags (multi-select)
- Attachments (files, images, links, Loom videos)
- Activity log (every change timestamped + who did it)
- Comments (threaded, with @mentions, reactions, file attachments)
- AI Panel (right-click → "Ask AI about this task")
- Dependency view (blocks / blocked by)
- Related items (linked tasks in other boards)
- GitHub integration (linked PR, branch, commit)
- Watchers (people who get notified on changes)

---

### 1.4 Groups / Sections

- Board items grouped into sections (e.g., "To Do", "In Progress", "Done")
- Sections are collapsible
- Sections can be reordered by drag-and-drop
- Section-level: collapse, duplicate, move to board, delete
- Auto-create section per status (optional board setting)

---

### 1.5 Templates Library (300+)

**Categories**:
- Project Management (Agile, Waterfall, Scrum)
- Marketing (Campaign, Content Calendar, Social Media)
- Sales (CRM Pipeline, Lead Tracking, Proposal)
- Engineering (Bug Tracker, Sprint, Roadmap, On-call)
- HR (Onboarding, Recruitment, Performance Review)
- Finance (Budget Tracker, Expense Report)
- Design (Design System, Brand Guidelines)
- Customer Success (Onboarding, Churn Prevention)
- Operations (SOPs, Runbooks, Vendor Management)
- Education (Course Planner, Research Tracker)

**AI Template Generator**: "Describe your project" → Gemini generates a complete board with columns, groups, and sample items. (300+ pre-built + infinite AI-generated)

---

## Product 2: FlowOS Workflow Automation

### 2.1 Automation Builder

- **Visual drag-and-drop builder** (no code required)
- **Code mode**: write JavaScript for custom logic (Pro+)
- **Template automations**: 50+ pre-built one-click automations
- **AI automation generator**: describe what you want → Claude generates the automation

### 2.2 Triggers (22 triggers)

1. Item created
2. Item status changes to [X]
3. Item assigned to [person]
4. Item due date arrives (today / 1 day before / 1 week before)
5. Item due date passes (overdue)
6. Column value changes
7. Item moved to board
8. Item deleted
9. Comment added
10. File attached
11. Form submitted
12. Sub-item created
13. Sub-item status changes
14. Time tracking stopped
15. GitHub PR merged (Dev plan)
16. GitHub issue closed (Dev plan)
17. GitHub commit pushed
18. New deal stage reached (CRM)
19. Deal value exceeds [amount]
20. New contact created
21. Webhook received (external trigger)
22. Schedule (every day/week/month at time)

### 2.3 Actions (25 actions)

1. Change item status
2. Change column value
3. Assign to person
4. Unassign person
5. Create new item in [board]
6. Create sub-item
7. Move item to [board]
8. Duplicate item
9. Delete item
10. Send notification (in-app)
11. Send email notification
12. Send email to contact (CRM)
13. Send Slack message (via webhook)
14. Send Zulip message
15. Post to webhook URL
16. Create deal in CRM
17. Update deal stage
18. Create invoice
19. Assign label
20. Remove label
21. Add watcher
22. Set due date (relative: +3 days, +1 week)
23. Set priority
24. AI: generate task description
25. AI: generate subtasks from title

### 2.4 Automation Metering

```
Plan        Automations/month    Behavior when exceeded
Free        50                   Automations paused; banner shown
Basic       250                  Automations paused; email sent
Standard    2,500                Automations paused; upgrade prompt
Pro         25,000               Automations paused; upgrade prompt
Enterprise  Unlimited            Never paused
```

Add-on: +5,000 automations/month = $10/month

---

## Product 3: FlowOS Docs

### 3.1 Block Editor (BlockNote-powered)

**Block Types**:
- Paragraph
- Heading (H1 / H2 / H3)
- Bullet list / Numbered list / Checklist (to-do)
- Code block (with syntax highlighting, 50+ languages)
- Quote / Callout (info, warning, error styles)
- Divider
- Image (upload, URL, drag-from-board)
- Video embed (YouTube, Loom, Vimeo)
- File attachment
- Table (resizable, sortable columns)
- Board embed (live task board inline in doc)
- Mention (@person, @board, @item)
- AI block ("Ask AI to write this section")
- Math (LaTeX equations)

**Collaboration**:
- Real-time multi-user editing (Y.js CRDT — no conflicts)
- Live cursors with user name labels
- Comments on any block (threaded)
- Suggestion mode (tracked changes, accept/reject)
- Version history (restore any saved version)

**Source**: `twenty-main/src/modules/blocknote-editor/` + `Kojit` (AI writing assistant)

### 3.2 Document Organization

- Docs linked to boards, items, or standalone
- Folder hierarchy (unlimited nesting)
- Workspace wiki (pinned docs for team reference)
- Public sharing link (read-only, optional password)
- Export: PDF, Markdown, HTML, Notion import

---

## Product 4: FlowOS CRM

### 4.1 CRM Boards (Sales Pipeline)

- Custom pipeline stages (drag-and-drop)
- Deal cards with: value, contact, company, probability, close date
- Win/loss tracking with reason
- Activity timeline per deal (emails, calls, meetings, notes)
- Revenue forecasting widget
- Email integration (send/receive from deal panel)
- Source: `twenty-main/src/modules/opportunity/` + `aureuserp-master/plugins/webkul/sales/`

### 4.2 Contacts & Companies

- Contact profiles: name, email, phone, social, company, tags, notes
- Company profiles: name, domain, industry, size, ARR, linked contacts
- Auto-enrich: paste email → Clearbit/Apollo lookup fills profile (Pro+)
- Merge duplicate contacts
- CSV import/export
- Source: `twenty-main/src/modules/object-record/`

### 4.3 AI-Driven CRM (FlowOS CRM Intelligence)

- **Lead scoring**: Claude analyzes deal activity → scores 0–100 likelihood to close
- **Next action suggestion**: "You haven't followed up with this deal in 7 days. Suggested: send proposal"
- **Deal summary**: one-click Claude summary of all deal activity
- **Email draft**: AI writes follow-up email based on deal context
- **Churn prediction**: flags accounts showing disengagement signals
- Source: `agency-agents-main/sales/` + `awesome-openclaw-agents-main/agents/saas/`

### 4.4 Service Desk (Helpdesk)

- Ticket inbox from email, form, or chat widget
- Auto-assign tickets by rule or round-robin
- SLA policies (first response, resolution time)
- Canned responses (AI-suggested based on ticket content)
- AI ticket resolution: Gemini suggests answer from knowledge base
- CSAT rating (customer satisfaction survey on close)
- Source: `YetiForceCRM-developer/modules/HelpDesk/`

---

## Product 5: FlowOS Dev (Agile for Engineers)

### 5.1 Sprint Board

- Sprint planning: drag backlog items into sprint
- Sprint start/end dates + velocity tracking
- Burndown chart (auto-calculated)
- Story points field (Fibonacci by default)
- Sprint retrospective doc (auto-created from AI summary)

### 5.2 GitHub Integration (Kojit + Multiboard patterns)

- Connect GitHub repo to board
- Branch created → auto-creates item or updates linked item
- PR opened → item moves to "In Review"
- PR merged → item moves to "Done"
- PR review requested → assigns reviewer in FlowOS
- Commit messages parsed for item IDs (#FLOW-123)
- CI/CD status badge on item (pass/fail)
- Source: `Kojit` (GitHub-native workflows), `Multiboard` (Kanban ↔ GitHub sync)

### 5.3 Roadmap View

- Quarterly/monthly roadmap with epics and milestones
- Dependency arrows between epics
- Status rollup (% of child items complete)
- Export to PDF / share public link
- Source: `Kojit` (AI commit analysis → roadmap generation)

---

## Cross-Product Features

### Global Search (Cmd+K)
- Searches: boards, tasks, docs, contacts, deals, files, comments
- Natural language: "show me overdue tasks assigned to me"
- Results grouped by type with keyboard navigation
- Source: Meilisearch + `twenty-main/src/modules/command-menu/`

### Notifications Center
- In-app notification bell (all mentions, assignments, due dates)
- Per-notification settings (in-app / email / push)
- Digest emails (daily/weekly summary)
- Do Not Disturb hours
- Mobile push (React Native — Phase 4)

### Inbox View (Personal)
- My Tasks: all tasks assigned to me across all boards
- My Mentions: all @mentions
- My Upcoming: tasks due in next 7 days
- My Overdue: tasks past due date

### Dashboard (Widgets)
- Add any widget to personal or shared dashboards
- Widget types: table, chart (bar, line, pie, donut), number KPI, progress bar, calendar, board embed, map
- Data source: any board column
- Refresh: real-time or scheduled
- Source: `aureuserp-master/plugins/webkul/analytics/` + `twenty-main/src/modules/dashboards/`

### Time Tracking
- Start/stop timer on any item
- Manual time entry
- Timesheet view per person/per week
- Export timesheets as CSV
- Billable hours tracking (mark time as billable)
- Source: `aureuserp-master/plugins/webkul/timesheets/`

### Guest Access
- Invite external stakeholders by email
- Guests only see boards they are explicitly added to
- Guests cannot see workspace members list or settings
- Guest count metered per plan (see PRICING_AND_BILLING.md)

### White-Label (Pro+)
- Custom domain (app.yourcompany.com)
- Custom logo + brand colors
- Remove "Powered by FlowOS" badge
- Custom email sender (noreply@yourcompany.com)

### Integrations (Phase 3+)
- Slack (2-way: notifications + slash commands)
- Microsoft Teams
- Google Calendar / Outlook Calendar
- Gmail / Outlook email
- GitHub (native — see FlowOS Dev)
- Zapier / Make (webhook trigger/action)
- REST API + webhooks (all plans)
- Custom OAuth apps (Enterprise)

---

*Owner: Product Lead*  
*Cross-reference: ARCHITECTURE.md, AI_STRATEGY.md, PRICING_AND_BILLING.md*

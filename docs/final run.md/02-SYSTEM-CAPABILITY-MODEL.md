# System Capability Model (Monday/ClickUp Level, Practical Scope)

Date: 2026-05-30

## Capability pillars

1. Work management core
- Tasks, subtasks, dependencies, statuses, priorities, multiple assignees.
- Views: list, board, calendar, table, timeline/gantt.
- Workload and capacity views.

2. Collaboration core
- Task comments and threaded replies.
- Mentions for user and group.
- Reactions (including thumbs-up) on comments/messages.
- Watchers/followers and notification subscriptions.
- Unified inbox with actionable events.

3. Knowledge and communication
- Task-linked docs and notes.
- Internal chat channels + direct messages.
- Meeting notes and action-item extraction.
- Decision log attached to task/project.

4. Time and execution control
- Due dates, reminders, recurring work, SLA clocks.
- Personal focus queue and team queue.
- Escalation rules and handoff protocols.
- Effort estimate vs actual tracking.

5. Governance and enterprise safety
- Owner/admin/manager/member/viewer roles + custom policy overlays.
- Delegated admin with expiry and scope.
- Field permissions + object-level permissions.
- Full audit logging for sensitive actions.

6. Template and standardization
- Cross-module templates with variables.
- Versioning, approvals, publish/deprecate lifecycle.
- Organization default templates and team overrides.

7. Automation and integrations
- Rule-based automation with retries and idempotency.
- External connectors (Stripe/Google/Microsoft) with replay safety.
- Webhooks with ledger and dead-letter handling.

8. Reporting and control tower
- Role-based dashboards.
- Drill-down from KPI to source records.
- Exception reporting, scheduled reports, distribution lists.

## Feature mapping: keep, build, delay

Keep and harden now:
- Existing comments and notifications.
- Existing workspace roles and SCIM/field-permission work.
- Existing route surface and report scheduling.

Build now (high impact):
- Watchers/followers.
- Comment reaction model (thumbs-up and more).
- Mention resolver by display name/group alias.
- Task-thread read state and notification fanout controls.
- Delegated admin policies and audit endpoints.

Delay (avoid over-engineering for now):
- Full whiteboard parity.
- Deep AI agents for all modules.
- Plugin marketplace and digital twin expansions.

## Monday/ClickUp pattern import without bloat

Import from Monday style:
- Visual clarity and status-driven communication.
- Board-centric simple operations for non-technical users.
- Easy template-first onboarding.

Import from ClickUp style:
- Deep task-level collaboration (threads, mentions, assignable comments).
- Unified chat/docs/tasks context.
- Reminders, recurring workflows, hierarchy and workload views.

Do not import blindly:
- Too many configurable knobs without governance.
- Feature overlap that creates duplicate workflows.

## "Powerful but practical" design rule

Every new feature must answer all three:

- What workflow does this shorten?
- What failure mode does this prevent?
- How is this tested and observed in production?

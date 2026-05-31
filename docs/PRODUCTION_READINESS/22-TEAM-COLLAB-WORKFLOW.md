# TEAM COLLABORATION AND WORKFLOW - PRODUCTION READINESS REVIEW

**Date:** May 29, 2026  
**Scope:** Team communication, tagging, watchers, hierarchy flow, folder sharing, data control, inter-department requests, groups/subgroups, and workflow hardening.

## Direct Answers To The Questions

1. Can users in the team communicate with each other?
- Partially yes.
- Chat channels exist (dm, group, channel) and messages are implemented.
- Gap: Membership and access checks are incomplete on some message/channel operations, and there is no unified task-linked conversation layer.

2. Can users tag each other on tasks?
- Partially yes.
- Mentions are supported in comments, but only via UUID mention format.
- Gap: No human-friendly @name mention resolver, no mention picker, no mention ACL by visibility scope.

3. Can users set members as watch on a task or todo?
- No.
- There is assignee support, but no watcher/follower model for passive subscribers.

4. Do activities and tasks flow in the system by hierarchy?
- Partially yes.
- Items support parent-child (subitems), employee groups and reports_to exist.
- Gap: No dependency graph enforcement by org hierarchy, no manager approval gates, no escalation chains by reporting tree.

5. Can folders be shared to tagged team members?
- No (not production-complete).
- Document/folder data model exists, but no folder permission/share API and no share matrix.

6. Can users control where their data goes and who can view it?
- Partially yes.
- Workspace scoping, row-level security setup, and field-level permissions exist.
- Gap: Missing explicit object-level sharing policy (document/folder/item), no policy explanation surface, and no user-facing data residency controls.

7. Can a user request from another user in same team by department?
- Not as a first-class workflow.
- Department, employee groups, and reports_to fields exist.
- Gap: No request workflow entity, no routing engine by department/group, no SLA/escalation pipeline.

8. Can team members form groups or subgroups to control tasks and workflow?
- Partially yes.
- Employee groups exist; board groups exist.
- Gap: No subgroup nesting for employee groups, no group-level task ownership rules, no policy-bound workflow lanes.

## Codebase Reality Snapshot (What Exists)

### Strong Foundations
- Workspace membership and roles with owner/admin/member/viewer model.
- Employee groups, manager relationship, and reports_to fields.
- Items with subitems, assignees, dependencies, activity log, notifications, and realtime events.
- Chat channels/messages with DM and group channel support.
- Field-level permissions and RLS tenant plumbing.

### Critical Gaps Blocking Real Team Operations
- No watcher model for tasks/todos.
- Mentions only support UUID pattern, not normal team mention UX.
- Comments and migrations show schema drift risk (implementation shape mismatch risk).
- Document folders exist but no complete folder sharing/permission API.
- Missing first-class cross-department request workflow (request, approve, route, escalate, audit).
- Group/subgroup governance is not tied to assignment, workflow transitions, or approvals.
- Notification routing does not support watcher/subgroup-specific channels and digest controls.
- Role checks are not consistently enforced per endpoint for sensitive actions.

## Production Design Target (What Must Exist)

## 1) Team Communication Model
- Unified communication primitives:
  - Channel conversation (existing chat).
  - Task thread conversation (item-scoped).
  - Decision log entries (approval, reject, delegate).
- Mention model:
  - Parse @displayName and @groupAlias.
  - Resolve to stable user/group IDs.
  - Persist mention records for audit and unread tracking.
- Read model:
  - Per-user read pointer by channel/thread.
  - Unread counters by workspace, group, and task.

## 2) Watchers and Subscribers
- Add watchers table for items/todos with notification preferences.
- Watchers receive status, assignee, due date, comment, attachment, and dependency change notifications.
- Distinguish assignee from watcher to prevent noise and preserve ownership clarity.

## 3) Hierarchy-Driven Workflow
- Workflow policies should support:
  - If task belongs to department X, allowed assignees must include group X members.
  - If priority is critical, require manager approval before Done.
  - If overdue and unowned, escalate to reports_to chain.
- Add policy-bound state transitions:
  - blocked -> in_progress requires dependency clear.
  - ready_for_review -> done requires reviewer role.

## 4) Folder and Document Sharing
- Add object-level ACL for folders/documents:
  - Principal types: user, group, role.
  - Permissions: view, comment, edit, share, manage.
  - Inheritance: folder ACL cascades by default, override allowed.
- Add share links with expiry and optional password for external access.
- Every permission grant/revoke logged to audit trail.

## 5) Data Control and Visibility Governance
- Extend field permissions to object permissions:
  - Field-level handles what can be seen in record fields.
  - Object-level handles who can access specific records/folders/tasks.
- Add policy introspection endpoint:
  - Returns why user can or cannot access an object.
- Add user-facing controls:
  - Notification scope, profile visibility, and data export scope.

## 6) Inter-Department Request Workflow
- Introduce Request entity for internal service workflows:
  - request_type, from_user/group, to_group/department, priority, SLA, status, due_at.
- Standard lifecycle:
  - draft -> submitted -> triaged -> accepted/rejected -> in_progress -> done -> closed.
- Routing:
  - Auto-route by request type + department.
  - Escalate by SLA breach to manager chain.
- Link requests to items/documents/messages for full traceability.

## 7) Groups and Subgroups
- Expand employee_groups into hierarchical structure:
  - parent_group_id for subgroup nesting.
  - policy settings per group (visibility, approval requirements, assignment constraints).
- Group-level workload controls:
  - capacity budgets, WIP limits, and queue ownership.
- Group-level dashboards:
  - throughput, SLA attainment, blockers, escalation rate.

## Implementation Blueprint

## Phase P0 (Immediate, 2-3 weeks)
1. Add task watchers and watcher notifications.
2. Add mention resolver for @name and @group with notification fanout.
3. Enforce membership/participant authorization in chat and item-comment operations.
4. Add object-level ACL tables for documents/folders/items (minimal version).
5. Add first Request workflow for cross-department handoff (basic lifecycle + SLA timestamps).

Deliverables:
- New DB tables: task_watchers, mentions, object_permissions, internal_requests, request_events.
- New APIs for watchers, mentions, permissions, requests.
- Realtime events for watcher updates and request state changes.

## Phase P1 (Core Workflow Control, 3-5 weeks)
1. Add group/subgroup hierarchy with parent_group_id and policy inheritance.
2. Add workflow transition guardrails by role/group/dependency.
3. Add folder sharing UI with inheritance preview and effective permissions panel.
4. Add escalation engine (SLA, manager chain, fallback group).
5. Add audit pages for permission and request events.

Deliverables:
- Workflow policy engine.
- Permission explanation endpoint.
- Escalation jobs and retry-safe automations.

## Phase P2 (Supercharge and Scale, 4-8 weeks)
1. Add advanced notification controls (digest windows, channel routing, mute rules).
2. Add workload balancing by group capacity and member availability.
3. Add org-aware automation templates by department.
4. Add searchable collaboration graph (task -> comments -> requests -> docs -> decisions).
5. Add compliance exports for audits and incident review.

Deliverables:
- Team intelligence dashboards.
- Cross-group handoff heatmaps.
- Full audit export package.

## API Surface To Add

- Watchers:
  - POST /workspaces/{workspace}/boards/{board}/items/{item}/watchers
  - DELETE /workspaces/{workspace}/boards/{board}/items/{item}/watchers/{user}
  - GET /workspaces/{workspace}/boards/{board}/items/{item}/watchers

- Mentions:
  - POST /workspaces/{workspace}/mentions/resolve
  - GET /workspaces/{workspace}/mentions/suggestions

- Folder Sharing:
  - GET /workspaces/{workspace}/documents/folders/{folder}/permissions
  - POST /workspaces/{workspace}/documents/folders/{folder}/permissions
  - DELETE /workspaces/{workspace}/documents/folders/{folder}/permissions/{id}

- Internal Requests:
  - POST /workspaces/{workspace}/requests
  - GET /workspaces/{workspace}/requests
  - PATCH /workspaces/{workspace}/requests/{request}
  - POST /workspaces/{workspace}/requests/{request}/assign
  - POST /workspaces/{workspace}/requests/{request}/escalate

- Group/Subgroup:
  - PATCH /workspaces/{workspace}/employee-groups/{group}/parent
  - GET /workspaces/{workspace}/employee-groups/tree

## Workflow Rules To Enforce

- No task can move to done if dependency is open.
- Critical tasks require reviewer approval (owner/admin/manager).
- Department-owned tasks can only be assigned within allowed group policy unless override is logged.
- Folder visibility defaults to private unless explicitly shared.
- All permission changes emit audit events and notify affected users.

## Supercharge List (High-Value Additions You Did Not Explicitly Ask)

1. Delegation with expiry:
- Temporary delegated authority for leave/coverage.

2. Decision records:
- Structured decision log attached to tasks/requests/docs.

3. SLA clocks everywhere:
- Apply SLA timers to requests, task review states, and approval queues.

4. Handoff contracts:
- Required checklist and acceptance criteria when one group hands work to another.

5. Escalation quality scoring:
- Track noisy escalations vs valid escalations to tune rules.

6. Team operating modes:
- Incident mode, normal mode, close mode with different routing/approval policies.

7. Workflow simulation:
- Dry-run automations and routing policy impact before activation.

8. Governance fail-safes:
- Lockdown mode for sensitive folders/processes during audits or incidents.

## Key Risks To Address During Build

- Schema drift between migrations and controller assumptions.
- Notification overload without preference controls.
- Role leakage if route-level and object-level authorization diverge.
- Realtime fanout volume spikes once watchers and mentions scale.
- Complex policy UX if permission inheritance is not explainable.

## Acceptance Criteria (Production Gate)

1. Team members can communicate via channels and task threads with verified access checks.
2. Users can @mention users/groups by name, and mentions are persisted and auditable.
3. Users can watch/unwatch tasks and receive configurable notifications.
4. Tasks can be routed and escalated by department/group hierarchy.
5. Folders/documents can be shared to users/groups with inheritance and explicit ACLs.
6. Users can see why they can access data, and admins can audit all permission changes.
7. Cross-department request workflow supports assignment, SLA, escalation, and closure.
8. Group and subgroup policies can control assignments, approvals, and workflow transitions.

## Final Verdict

Current state is partially collaborative but not operationally trustworthy for multi-team execution.  
With the P0-P2 blueprint above, Aquerii can move from feature-level collaboration to enterprise-grade team workflow control.

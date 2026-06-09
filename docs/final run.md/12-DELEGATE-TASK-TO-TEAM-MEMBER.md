# Delegate Task to Team Member

Date: 2026-05-30

## What it is

A first-class workflow that lets any authorized user transfer ownership of a task, subitem, or internal request to another team member — with full audit trail, notification, and optional expiry.

This is not the same as assigning a collaborator. Delegation transfers primary ownership and accountability.

---

## Who can delegate

| Role | Can delegate own tasks | Can delegate others' tasks |
|---|---|---|
| Owner | Yes | Yes |
| Admin | Yes | Yes |
| Manager | Yes | Yes (within their team) |
| Member | Yes | No |
| Viewer | No | No |

---

## Delegation record

Every delegation creates an explicit record:

| Field | Type | Description |
|---|---|---|
| id | UUID | Unique delegation ID |
| workspace_id | UUID | Scoped to workspace |
| task_id | UUID | The task being delegated |
| from_user_id | UUID | User transferring ownership |
| to_user_id | UUID | User receiving ownership |
| reason | string | Required. Short explanation |
| delegated_at | timestamp | When it happened |
| expires_at | timestamp | Optional. Auto-returns after this |
| returned_at | timestamp | Nullable. Set if ownership returned early |
| notes | text | Optional context for the receiver |

---

## Delegation lifecycle

```
owner assigns task
       |
       v
   delegate action triggered
       |
       v
   delegation record created
       |
       v
   receiving user notified
       |
       +-- accepts explicitly (high-stakes tasks)
       |-- auto-accepts (standard tasks)
       |
       v
   task ownership transferred
       |
       +-- expires_at reached -> ownership auto-returns to delegator
       +-- receiver marks done -> delegation closes
       +-- delegator revokes -> ownership returned immediately
```

---

## Notification behavior

When a task is delegated:
- Receiver gets an in-app notification with task context and reason.
- Original owner (delegator) gets a confirmation.
- Watchers are informed of owner change.
- Activity log records the full delegation event.

When delegation expires or is revoked:
- Delegator is notified task has returned.
- Receiver is notified ownership has ended.

---

## Delegation with expiry (time-bound coverage)

Use case: team member is on leave.

Steps:
1. Manager opens task.
2. Clicks "Delegate" and selects team member.
3. Enters reason: "On leave until 2026-06-10".
4. Sets expiry: 2026-06-10.
5. Confirms.

Behavior:
- Task ownership moves immediately.
- On expiry date, ownership returns to delegator.
- Both parties receive reminders at 24h before expiry.

---

## Bulk delegation

Use case: manager redistributing tasks during workload spike.

Steps:
1. Open team workload view.
2. Multi-select tasks from overloaded member.
3. Delegate all to chosen member.
4. Set shared reason and optional expiry.

---

## UI flow

```
Task detail panel
  └─ [Owner avatar] + "Delegate" button
       └─ Delegation modal
            ├─ Member picker (search by name/team)
            ├─ Reason field (required)
            ├─ Optional expiry date picker
            ├─ Optional note for receiver
            └─ [Confirm Delegation] button
```

---

## API endpoints

```
POST   /workspaces/{workspace}/boards/{board}/items/{item}/delegate
       Body: { to_user_id, reason, expires_at?, notes? }

DELETE /workspaces/{workspace}/boards/{board}/items/{item}/delegate
       Body: { reason }    -- revoke delegation

GET    /workspaces/{workspace}/delegations
       Query: ?direction=sent|received&status=active|expired
```

---

## Audit and compliance

Every delegation action emits an audit event:

- `task.delegated` — initial transfer
- `task.delegation_accepted` — explicit acceptance logged
- `task.delegation_revoked` — owner revoked
- `task.delegation_expired` — expiry triggered auto-return
- `task.delegation_returned` — task ownership back with delegator

All audit fields include: actor, target, workspace, reason, timestamp, source IP.

---

## Acceptance criteria

- Delegation creates record and transfers ownership in one atomic operation.
- Receiver is notified immediately.
- Expiry auto-returns ownership without manual intervention.
- Delegation cannot escalate permissions beyond receiver's role.
- All delegation events appear in workspace audit log.
- Bulk delegation completes atomically or not at all.
- Delegated tasks appear in receiver's My Day and team workload view.
- Original owner retains read access and watcher status after delegating.

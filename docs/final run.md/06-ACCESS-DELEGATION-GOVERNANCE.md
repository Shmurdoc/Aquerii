# Access, Delegation, and Governance

Date: 2026-05-30

## Owner and delegated-admin model

Base roles:
- owner
- admin
- manager
- member
- viewer

Delegated admin is time-bound and scope-bound.

Delegation record fields:
- delegator_user_id
- delegate_user_id
- scope (members, billing, templates, approvals, reports)
- workspace_id
- starts_at
- expires_at
- reason
- approval_required
- revoked_at

## Business owner requirements

Owner can:
- add/remove users
- define who can invite users
- define who can assign roles
- define who can create delegated admin grants

Rules:
- Only owner can grant delegation of member-management rights.
- Delegated member-management cannot grant owner role.
- All role changes require audit event with actor and reason.

## Permission layers

1. Workspace role permissions.
2. Field-level permissions.
3. Object-level ACL (task/doc/folder/request).
4. Action policies (approve/post/reverse/delete/share).

Permission explainability endpoint:
- returns why access is allowed/denied for user + object + action.

## User and team management controls

- Invite policies by domain and role.
- Just-in-time access with expiry.
- Emergency break-glass admin flow with dual approval.
- Automatic permission drift detection.

## Audit requirements

Every sensitive event logged:
- user invited
- role changed
- delegation granted/revoked
- permission changed
- template published
- financial state transition

Audit fields:
- actor, target, old value, new value, reason, timestamp, request_id, source_ip

## Compliance-ready operations

- quarterly access review reports
- orphaned privilege detection
- inactive admin detection
- mandatory MFA for owner/admin/manager roles

## Practical boundaries

Do not ship custom RBAC UI complexity before policy primitives are stable.
Start with policy APIs + controlled admin screens + strong audit visibility.

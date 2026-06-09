# Collaboration Flows (Solo, Semi-Solo, Group)

Date: 2026-05-30

## Unified communication contract

All work objects support:

- Comments (threaded).
- Mentions (user/group).
- Reactions (thumbs-up, agree, needs-work).
- Watchers (opt-in followers).
- Activity timeline (state transitions + who/when).

## Flow A: Solo execution

Use case:
- A single contributor executes end-to-end work.

Steps:
1. Create task from template.
2. Set due date, reminder schedule, estimate.
3. Add checklist and completion criteria.
4. Work in focus mode.
5. Auto-post daily progress snapshot.
6. Mark done with evidence attachment.

Controls:
- Reminder escalates only to self unless overdue by threshold.
- Optional peer review gate for high-risk task types.

## Flow B: Semi-solo / semi-group

Use case:
- One owner executes, group reviews or contributes at key steps.

Steps:
1. Owner creates task and tags collaborator group.
2. Add watchers from stakeholders.
3. Create handoff checkpoints: design, implementation, validation.
4. Owner posts update; mentions reviewers.
5. Reviewers react and comment in-thread.
6. Owner addresses feedback and closes checkpoint.
7. Final approval by manager/reviewer role.

Controls:
- Comment assignment is tracked as mini-actions.
- If review idle beyond SLA, escalate to manager.

## Flow C: Fully group execution

Use case:
- Cross-functional team handles a project stream.

Steps:
1. Create board from team template.
2. Load swimlanes by function (product, engineering, QA, ops).
3. Apply dependency mapping and WIP limits.
4. Assign owners per lane and SLA windows.
5. Daily standup updates auto-collected into digest.
6. Blockers auto-escalate based on dependency criticality.
7. Completed tasks require acceptance checklists.

Controls:
- No task can enter done if required dependencies are open.
- No high-risk release without QA signoff + rollback note.

## Comments and thumbs-up confidence loops

Purpose:
- Encourage fast positive reinforcement and clarity.

Rules:
- Thumbs-up reaction increments confidence indicator, not just vanity count.
- Confidence score affects task risk color and standup ordering.
- Low-confidence tasks rise in manager review queue.

## Cross-department request flow

Entity: internal request.

Lifecycle:
- draft -> submitted -> triaged -> accepted/rejected -> in_progress -> done -> closed

Fields:
- request_type, from_team, to_team, priority, due_at, SLA tier, approval_required.

Behavior:
- Auto-route by request_type and team ownership policy.
- Escalate when SLA breach risk crosses threshold.
- Link every request to comments, attachments, and decision records.

## Handoff protocol

Required at every team handoff:

- Problem statement.
- Scope boundaries.
- Acceptance criteria.
- Test evidence.
- Known risks.
- Owner on receiving side explicitly accepts handoff.

No acceptance = handoff not complete.

## Collaboration anti-patterns to block

- Side-channel decisions not logged in task context.
- Assigning work without due date and owner.
- Closing tasks without evidence.
- Mention spam to entire workspace.
- Group ownership with no accountable individual.

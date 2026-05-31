# Time Management and Reminder Engine

Date: 2026-05-30

## Objective

Provide powerful, low-noise, execution-oriented time control for individuals and teams.

## Core model

Time objects:

- due_at
- start_at
- reminder_at
- reminder_policy
- SLA target
- recurrence rule
- escalation tier

Reminder policies:

- none
- one-shot (single reminder)
- staged (for example: 24h, 2h, 15m)
- recurring follow-up (until completion or snooze limit)

## Personal control plane

My Day should include:

- Today focus list.
- Overdue list.
- Waiting on others list.
- Follow-up list.
- Deep-work blocks.
- Time estimate variance panel.

Actions:
- Snooze with reason.
- Convert reminder to task.
- Delegate with expiry.
- Escalate to manager.

## Team control plane

Team reminders:

- Daily team digest by role.
- SLA breach warning queue.
- At-risk dependency queue.
- Unacknowledged blocker queue.

Manager reminders:

- Approval backlog.
- Stalled tasks over threshold.
- Team overload warnings.

## Reminder delivery channels

- In-app notifications (primary).
- Email digest (secondary).
- Optional chat channel notifications.

Delivery controls:
- Do not repeat if read state acknowledged.
- Respect quiet hours by user timezone.
- Escalate only when owner non-responsive past policy window.

## Recurring work

Support:

- daily/weekly/monthly patterns
- weekday-only schedules
- business-calendar exclusions

For recurring tasks:
- next occurrence generated from completion date or schedule anchor.
- missed occurrences collapse into a single actionable instance to avoid spam.

## SLA and escalation logic

SLA states:
- healthy
- risk
- breached

Escalation sequence:
1. owner reminder
2. owner + watcher reminder
3. manager alert
4. team lead alert
5. incident flag for critical queues

## Quality requirements

- Reminder jobs are idempotent.
- Every sent reminder has audit event.
- No duplicate sends from retries.
- Observability metrics:
  - reminders_sent_total
  - reminders_deduped_total
  - reminders_escalated_total
  - reminder_ack_time_p50/p95

## High-value additions

- Confidence-aware reminder prioritization using reaction and blocker signals.
- Focus protection: system suppresses low-priority reminders during active focus block.
- "Finish mode": batched reminders for end-of-day closure.

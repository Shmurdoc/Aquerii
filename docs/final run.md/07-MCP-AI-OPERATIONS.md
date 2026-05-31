# MCP and AI Operations Strategy

Date: 2026-05-30

## Objective

Use AI where it increases speed and quality without creating hidden risk.

## AI modes

1. Assist mode
- Suggest summaries, drafts, and recommendations.
- Human approves before write actions.

2. Controlled action mode
- AI can trigger safe automations inside bounded scope.
- Requires policy checks and audit logs.

3. Autonomous mode (restricted)
- Allowed only for low-risk operations and data hygiene tasks.

## MCP integration principles

- MCP tools are policy-scoped by workspace role and action type.
- Every MCP action has trace id and audit payload.
- Tool calls that can mutate finance/permissions require explicit approval gates.

## High-value AI use cases now

- Comment summarization and decision extraction.
- Meeting transcript to action item generation.
- Reminder prioritization by risk.
- Cross-project blocker detection.
- Report variance explanations.

## AI safety controls

- Prompt injection filtering.
- Data classification guardrails.
- PII redaction in non-essential outputs.
- Output confidence scoring and escalation when low confidence.

## Cost and quality governance

Track per-team metrics:
- AI calls per workflow
- cost per useful action
- acceptance rate of AI suggestions
- failure and rollback rate

## No-overengineering rule

Do not build "AI everywhere".
Build "AI where the team repeatedly wastes time".

## Required AI acceptance tests

- deterministic behavior for fixed fixtures where expected
- safe degradation when AI service unavailable
- no privilege escalation through AI actions
- audit continuity for all generated actions

---
name: observability-and-monitoring
description: Logging, metrics, tracing, SLOs/SLOs, alerting, and dashboards to detect, understand, and act on production issues.
applyTo:
	- "**/observability/**"
	- "**/*.md"
keywords:
	- observability
	- monitoring
	- sog
---

# Observability & Monitoring

## Purpose
Ensure production systems are observable with clear SLOs, actionable alerts, and diagnostic traces.

## Activation Gate
Activate when deploying services, adding new endpoints, or altering critical paths.

## Workflow Contract
1. Define SLI/SLO/SLA targets and error budgets.
2. Instrument code paths with metrics, structured logs, and traces.
3. Create alerting rules tuned to actionable thresholds and runbooks.
4. Provide dashboard templates and sampling guidelines for traces.

## Hard Rules
- Alerts must map to a runbook with clear next actions.
- Avoid noisy alerts; tune to signal-to-noise thresholds.

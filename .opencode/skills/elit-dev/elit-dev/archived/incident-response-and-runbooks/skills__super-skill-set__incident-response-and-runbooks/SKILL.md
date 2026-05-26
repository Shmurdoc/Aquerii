---
name: incident-response-and-runbooks
description: Incident response playbooks, on-call procedures, postmortem templates, and escalation paths to contain and learn from production incidents.
applyTo:
	- "**/runbooks/**"
	- "**/*.md"
keywords:
	- incident
	- runbook
	- oncall
---

# Incident Response & Runbooks

## Purpose
Provide clear, actionable runbooks and postmortem practices to quickly contain incidents and fix root causes.

## Activation Gate
Activate when production alerts trigger or when post-incident learning is required.

## Workflow Contract
1. Maintain runbooks for common alerts with step-by-step containment actions.
2. Define on-call responsibilities and escalation matrix.
3. Provide postmortem templates that focus on remediation and preventive actions.
4. Integrate incident runbooks with alerting and paging configuration.

## Hard Rules
- Postmortems must be blameless and include action owners and deadlines.
- Runbooks must be tested regularly.

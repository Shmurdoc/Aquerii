---
name: chaos-and-resilience-testing
description: Chaos engineering practices, fault injection guidance, and resilience testing to validate system robustness under adverse conditions.
applyTo:
	- "**/chaos/**"
	- "**/*.md"
keywords:
	- chaos
	- resilience
	- fault-injection
---

# Chaos & Resilience Testing

## Purpose
Proactively validate system behavior under faults to uncover hidden assumptions and improve resiliency.

## Activation Gate
Activate when systems reach production readiness or for periodic resilience validation.

## Workflow Contract
1. Define steady-state hypothesis and blast radius controls.
2. Design experiments with rollback and safety gates.
3. Automate failure injection in staging and observe recovery paths.
4. Document learnings and remediation actions.

## Hard Rules
- Chaos experiments require safety approvals and rollback plans.
- Never run destructive experiments in production without strict controls.

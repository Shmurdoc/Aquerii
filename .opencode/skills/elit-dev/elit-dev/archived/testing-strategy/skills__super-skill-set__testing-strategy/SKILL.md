---
name: testing-strategy
description: Define comprehensive testing strategy covering unit, integration, contract, e2e, property, fuzz, and chaos testing plus test data, flaky-test handling, and CI integration.
applyTo:
	- "**/test/**"
	- "**/*.md"
keywords:
	- testing
	- ci
	- quality
---

# Testing Strategy

## Purpose
Ensure safety and correctness by prescribing layered testing approaches, deterministic CI contracts, and test ownership rules.

## Activation Gate
Activate when writing critical business logic, integrating components, or before release gating.

## Scope Limit
Does not write implementation code; produces test plans, templates, and automation guidance.

## Workflow Contract
1. Define test pyramid and minimal coverage targets per component.
2. Specify deterministic test harness, fixtures, and data management practices.
3. Prescribe flaky-test detection, quarantine, and remediation workflow.
4. Provide CI pass/fail gating and parallelization guidance.

## Hard Rules
- Tests must be reproducible and isolated.
- CI gates require passing deterministic suites before deploy.

## Resource Map
Include sample test templates, mocks, and CI snippets.

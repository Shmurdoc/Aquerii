---
name: code-review-and-quality-gates
description: PR templates, review checklists, automated quality gates, linting, and static analysis workflows to maintain code quality and consistency.
applyTo:
	- "**/pull_request_template.md"
	- "**/*.md"
keywords:
	- code-review
	- quality-gates
	- pr
---

# Code Review & Quality Gates

## Purpose
Keep code quality high via human reviews and automated gates integrated into CI.

## Activation Gate
Activate on PR creation, major refactors, or architecture changes.

## Workflow Contract
1. Provide PR templates and mandatory review checklists.
2. Enforce automated gates: linters, type checks, SAST, dependency checks.
3. Define merge policies and required approvers per sensitive areas.

## Hard Rules
- Merge only after required checks and approvals pass.
- Sensitive areas require additional approvers and security sign-off.

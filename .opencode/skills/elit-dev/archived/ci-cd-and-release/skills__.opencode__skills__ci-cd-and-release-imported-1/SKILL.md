---
name: ci-cd-and-release
description: CI/CD and release engineering practices: pipeline design, reproducible builds, canary/blue-green strategies, release notes, rollback, and artifact management.
applyTo:
	- "**/.github/workflows/**"
	- "**/*.md"
keywords:
	- cicd
	- release
	- pipeline
---

# CI/CD & Release Engineering

## Purpose
Provide reliable, auditable, and reversible release processes integrated with testing and observability.

## Activation Gate
Activate when adding delivery pipelines, changing release cadence, or preparing production releases.

## Workflow Contract
1. Define pipeline stages and gating criteria (build, test, security scans, deploy).
2. Recommend artifact signing, immutable artifacts, and rollback strategies.
3. Provide deployment strategies (canary, blue/green, feature flags) with rollback plans.
4. Integrate release automation with changelog generation and owner notifications.

## Hard Rules
- Production deploys require pipeline approval and passing gates.
- Rollback procedure must be documented and tested.

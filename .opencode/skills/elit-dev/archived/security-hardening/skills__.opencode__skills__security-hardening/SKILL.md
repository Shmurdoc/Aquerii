---
name: security-hardening
description: Security best practices including threat modeling, secure coding guidelines, SAST/DAST/SCA integration, dependency hardening, secrets management, and breach readiness.
applyTo:
	- "**/security/**"
	- "**/*.md"
keywords:
	- security
	- sst
	- secrets
---

# Security & Hardening

## Purpose
Keep the codebase and deployment environment secure by embedding security checks, automated scans, and secure defaults.

## Activation Gate
Activate on new feature with external inputs, infrastructure changes, dependency additions, or before production deployment.

## Workflow Contract
1. Run threat modeling for changes that cross trust boundaries.
2. Enforce secure coding checks and linters.
3. Integrate SAST, DAST, and SCA into CI; fail builds for critical findings.
4. Recommend secrets management, least privilege, and runtime protections.
5. Provide incident response starter runbook pointers.

## Hard Rules
- Never store plaintext secrets in repo.
- Require PRs to include security impact notes for infra or auth changes.

## Resource Map
Point to common scanners, policy-as-code templates, and platform-specific hardening guides.

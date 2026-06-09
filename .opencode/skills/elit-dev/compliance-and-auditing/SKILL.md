---
name: compliance-and-auditing
description: Compliance checklists, SBOM generation, license auditing, data privacy notes, and audit-ready documentation practices.
applyTo:
	- "**/compliance/**"
	- "**/*.md"
keywords:
	- compliance
	- sbom
	- audit
---

# Compliance & Auditing

## Purpose
Make the codebase and release process audit-ready with SBOMs, license checks, and privacy controls.

## Activation Gate
Activate when preparing for audits, regulatory reviews, or when adding new third-party components.

## Workflow Contract
1. Generate and maintain SBOMs for releases.
2. Run license scanning and flag incompatible licenses.
3. Maintain privacy-impact notes and data-flow documentation.
4. Provide artifact and process evidence for audits.

## Hard Rules
- Do not ship artifacts without an SBOM for regulated releases.
- Risky third-party licenses require explicit approval.

---
name: data-pipelines-and-storage
description: Data architecture, ETL/ELT patterns, schema evolution, data validation, backups, and retention policies for production data systems.
applyTo:
	- "**/data/**"
	- "**/*.md"
keywords:
	- data
	- etl
	- pipeline
---

# Data Pipelines & Storage

## Purpose
Ensure data correctness, schema stability, and pipeline reliability for analytics and operational data flows.

## Activation Gate
Activate on new data pipelines, schema changes, or data-critical features.

## Workflow Contract
1. Define data contracts and schema evolution policies.
2. Provide validation, monitoring, and backfill strategies.
3. Recommend backup, retention, and data lifecycle management practices.

## Hard Rules
- Schema changes must be backward-compatible or gated with migration plans.
- Sensitive data must follow privacy and access control policies.

---
name: secrets-and-config-management
description: Secure storage and rotation of secrets, config schemas, environment separation, and runtime configuration best practices.
applyTo:
	- "**/secrets/**"
	- "**/*.md"
keywords:
	- secrets
	- config
	- vault
---

# Secrets & Config Management

## Purpose
Protect sensitive information and ensure safe runtime configuration across environments.

## Activation Gate
Activate when adding secrets, credentials, or environment-level configuration.

## Workflow Contract
1. Use a secrets manager; never commit secrets to repo.
2. Enforce least-privilege access and rotation policies.
3. Provide environment-specific config templates and runtime validation.

## Hard Rules
- Secrets must be stored in a managed secret store with audit logs.
- CI artifacts must not leak secrets in logs or artifacts.

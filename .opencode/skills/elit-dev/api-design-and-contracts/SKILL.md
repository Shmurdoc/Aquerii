---
name: api-design-and-contracts
description: API design, versioning, backward compatibility, contract testing, and client SDK generation guidance to ensure stable interfaces.
applyTo:
	- "**/api/**"
	- "**/*.md"
keywords:
	- api
	- openapi
	- contract
---

# API Design & Contracts

## Purpose
Provide guidelines for designing stable, discoverable, and testable APIs with clear versioning and contract tests.

## Activation Gate
Activate when designing public or internal APIs, or changing existing endpoints and contracts.

## Workflow Contract
1. Define API surface, semantics, and versioning strategy.
2. Provide contract tests and consumer-driven contract guidance.
3. Recommend backward/forward compatibility rules and deprecation policy.
4. Provide SDK generation and API documentation best practices.

## Hard Rules
- Breaking changes require explicit version bump and migration plan.
- Contract tests must be part of CI for critical APIs.

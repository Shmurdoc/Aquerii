---
name: architecture-design
description: Provide architecture design patterns, system decomposition, tradeoff analysis, and anti-patterns to ensure scalable, maintainable, and evolvable systems. Use when designing or reviewing system-level architecture decisions.
applyTo:
	- "**/architecture/**"
	- "**/*.md"
keywords:
	- architecture
	- system-design
---

# Architecture Design

## Purpose
Offer structured guidance to design system architecture, choose patterns, and evaluate tradeoffs for reliability, scalability, modularity, and operational simplicity.

## Activation Gate
Activate when: high-level system design, new subsystems, cross-cutting concerns, or architectural reviews are requested.

## Scope Limit
This skill focuses on architecture-level guidance, not implementation details or project management tasks.

## Ownership Boundary
Consume domain models, requirements, and constraints; refer implementation contract work to `execution-contract-designer` and `sdd-plan-maintainer`.

## Workflow Contract
1. Gather goals, constraints, non-functional requirements (SLOs/SLA), and existing assets.
2. Propose candidate architectures with rationale and tradeoffs.
3. Provide diagrams, component responsibilities, interfaces, data flows, and failure modes.
4. Recommend testing, observability, and deployment implications for each option.

## Hard Rules
- Always surface tradeoffs and open risks.
- Provide actionable next steps and owners for changes.

## Resource Map
Link to standards, patterns, and example architectures within repo references.

---
name: performance-and-scaling
description: Performance engineering, capacity planning, profiling, benchmarking, caching strategies, and scalability patterns.
applyTo:
	- "**/performance/**"
	- "**/*.md"
keywords:
	- performance
	- profiling
	- scaling
---

# Performance & Scaling

## Purpose
Ensure systems meet latency, throughput, and cost targets under expected loads with documented profiling and tuning guidance.

## Activation Gate
Activate when performance requirements exist or when systems show load-related degradation.

## Workflow Contract
1. Define performance budgets and acceptance criteria.
2. Provide benchmarking and load-test plans with representative workloads.
3. Instrument hotspots with profilers and recommend optimizations and caching.
4. Provide capacity planning and autoscaling guidance.

## Hard Rules
- Benchmark with representative data and isolated environments.
- Avoid premature optimization; focus on measurable hotspots.

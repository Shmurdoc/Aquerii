# SCENARIOS - DIGITAL TWIN / WHAT-IF PRODUCTION READINESS

## Verdict
Partially implemented but not decision-grade yet. The current scenario engine can snapshot and simulate simple adjustments, but it is still deterministic and lacks dependency-aware forecasting rigor for executive planning.

## Current State (From Code)
- Scenario CRUD exists, with snapshot capture and saved simulation results.
- Adjustment model exists with basic types: delay, resource, scope, deadline, remove task.
- Scenario comparison endpoint exists.
- Basic projected completion and risk outputs exist.

## Current Gaps Blocking Production Confidence
- No dependency graph or critical-path computation.
- No probabilistic forecasting (P10/P50/P90 outcomes).
- No calendar constraints (workdays, holidays, PTO).
- No confidence score based on data quality.
- No stale-result policy and no model version governance.
- No asynchronous run mode for large simulations.
- No explainability output for "why this date moved" by driver.

## Future-Ready Digital Twin Target

## 1. Engine Layers
- Snapshot Layer: immutable capture of tasks, assignments, dependencies, capacities, and assumptions.
- Transformation Layer: applies scenario adjustments to snapshot only (never mutates live records).
- Scheduler Layer: dependency ordering, critical path, and resource leveling.
- Forecast Layer: deterministic baseline + stochastic runs.
- Explainability Layer: top risk drivers, bottlenecks, and confidence metadata.

## 2. Forecasting Modes
- Fast mode (interactive): deterministic + sensitivity for UI sliders.
- Deep mode (batch): Monte Carlo with bounded iterations and percentile outputs.
- Portfolio mode: multi-project aggregate with cross-team capacity contention.

## 3. Performance Architecture
- Hard sync guardrails:
	- Max synchronous task count.
	- Early exit on unchanged inputs using deterministic input hash.
- Async queue execution for heavy runs.
- Result cache keyed by workspace + input_hash + engine_version.
- Incremental recompute for localized adjustment changes.

## 4. Reliability and Governance
- Engine versioning in simulation metadata.
- Validation contract for each adjustment type.
- Deterministic replay support for auditability.
- Simulation logs: runtime, task count, error class, and drift indicators.

## 5. Product Output Requirements
- Percentile completion dates (P10/P50/P90).
- Critical-path probability heatmap.
- Capacity overload windows by team/member.
- Driver analysis: top reasons forecast shifted.
- Quality flags: missing estimates, missing dependencies, stale input data.

## High-Performance SLOs
- Interactive run (small): p95 < 1.5s.
- Batch run (medium): p95 < 15s.
- Cache hit ratio: > 70% for repeated scenario toggles.
- Memory cap per run: bounded and observable.
- Timeout strategy: degrade to deterministic mode when limits are exceeded.

## Fix Strategy
1. Add dependency-aware scheduling and critical path.
2. Add fast-mode hash cache and stale-result policy.
3. Add async deep-mode simulation pipeline.
4. Add explainability and confidence outputs.
5. Add portfolio-level capacity contention modeling.

## Done Means
- Leadership can trust scenario outcomes in planning meetings.
- Teams can test tradeoffs (scope, staffing, deadlines) with explainable impact.
- The digital twin remains fast, observable, and safe under production load.

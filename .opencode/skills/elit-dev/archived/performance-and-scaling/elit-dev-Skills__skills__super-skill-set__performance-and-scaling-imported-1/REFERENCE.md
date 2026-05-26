# Performance & Scaling — Reference

Overview
- Establish performance budgets, representative workloads, and measurable acceptance criteria.

Checklist
- Define latency and throughput targets; set budgets per endpoint/service.
- Create load test scenarios that mimic production traffic patterns.
- Use profiling to identify CPU, memory, and I/O bottlenecks.

Benchmarking
- Use reproducible harnesses and fixture data; isolate resource noise.
- Record baselines and compare tuning changes against the baseline.

Optimization
- Recommend caching strategies, connection pooling, batching, and async IO where appropriate.
- Provide capacity planning guidance and autoscaling rules.

Automation
- `scripts/run_benchmarks.sh`, `scripts/profile_capture.sh` and sample k6/JMeter scenarios.

Metrics
- Track throughput, latency percentiles, resource utilization, and queue depths.

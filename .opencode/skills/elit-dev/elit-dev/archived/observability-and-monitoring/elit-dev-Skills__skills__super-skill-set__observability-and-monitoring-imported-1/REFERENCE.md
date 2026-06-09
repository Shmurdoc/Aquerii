# Observability & Monitoring — Reference

Overview
- Define SLIs/ SLOs, structured logging, metrics, and distributed tracing for core flows.
- Prioritize actionable alerts with clear runbooks and ownership.

Checklist
- Map critical user journeys and instrument their success/error signals.
- Capture high-cardinality context in logs while avoiding PII.
- Set SLO targets and error budgets; document escalation when budgets are breached.

Dashboards & Alerts
- Dashboards for business KPIs, latency, and error trends.
- Alerting rules tied to runbooks; tune thresholds to minimize noise.

Tracing
- Instrument request flows with trace IDs and sample smartly in high-throughput paths.
- Correlate traces with logs and metrics for faster debugging.

Examples
- Instrumentation snippets for typical web service handlers.
- Sample SLO definition and alerting rules.

Automation
- `scripts/collect_metrics.sh` and dashboard JSON templates for quick import.

Metrics
- Track MTTR, error rate, latency p95/p99, and alert-to-resolution time.

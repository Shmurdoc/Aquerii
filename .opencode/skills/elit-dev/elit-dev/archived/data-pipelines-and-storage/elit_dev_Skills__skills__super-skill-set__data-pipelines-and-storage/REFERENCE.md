# Data Pipelines & Storage — Reference

Overview
- Define data contracts, validation, and schema evolution policies to protect data integrity.

Checklist
- Enforce schema contracts at ingestion and consumer boundaries.
- Provide idempotent pipelines with backfill and replay strategies.
- Maintain data lineage and provenance for critical datasets.

Validation & Testing
- Use unit tests for transformation logic and integration tests for end-to-end flows.
- Provide data quality checks and anomaly detection for nightly runs.

Storage & Retention
- Define retention policies, backup cadence, and recovery drills.
- Ensure encryption at rest and in transit for sensitive datasets.

Automation
- `scripts/run_etl_local.sh`, `scripts/backfill.sh`, and sample Airflow/Kedro templates.

Metrics
- Track pipeline success rate, lag, data freshness, and error injections.

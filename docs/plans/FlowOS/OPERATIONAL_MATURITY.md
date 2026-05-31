# FlowOS — Operational Maturity

**Version**: 1.0  
**Status**: AUTHORITATIVE — no service ships to staging without satisfying every section here  
**Owner**: SRE Lead  
**Principle**: You do not earn the right to launch until you can detect every failure, explain every alert, and recover from every outage in under 30 minutes without reading a Slack thread.

---

## 1. Maturity Levels

Every service must reach **Level 3** before Phase 4 (closed beta). Public launch requires **Level 4**.

| Level | Criteria |
|-------|----------|
| L1 — Visible | Service emits health endpoint + basic metrics (CPU, memory, request count) |
| L2 — Observable | Distributed traces, structured logs, error rates, latency histograms, alerts configured |
| L3 — Operable | Runbooks written and tested, on-call rotation defined, incident response drilled |
| L4 — Resilient | Chaos tests passing, auto-recovery verified, SLOs enforced with error budgets tracked |

---

## 2. Observability Stack

### Stack Components

| Tool | Role | Port |
|------|------|------|
| **SigNoz** | Unified OTel backend (traces + metrics + logs) | 3301 (UI) |
| **OpenTelemetry Collector** | Agent on every service — receives, batches, exports | 4317 (gRPC) |
| **Prometheus** | Metrics scraping + alerting rules | 9090 |
| **Grafana** | Dashboards (pulled from Prometheus + SigNoz) | 3000 |
| **Loki** | Log aggregation (structured JSON logs from all services) | 3100 |
| **Promtail** | Log shipper (Docker → Loki) | sidecar |
| **Alertmanager** | Alert routing → PagerDuty / Slack | 9093 |

### OTel Instrumentation Per Service

**Laravel API (PHP)**:
```php
// bootstrap/app.php
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\Contrib\Otlp\OtlpHttpExporter;

$tracerProvider = new TracerProvider(
    new BatchSpanProcessor(
        OtlpHttpExporter::fromConnectionString('http://otel-collector:4318/v1/traces')
    )
);
// Auto-instrumentation: HTTP requests, DB queries, Redis, queue jobs
// via opentelemetry-auto-laravel package
```

**Node.js Realtime**:
```typescript
// src/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-collector:4318/v1/traces' }),
  instrumentations: [getNodeAutoInstrumentations()],
})
sdk.start()
```

**Python AI Service**:
```python
# main.py
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(
    endpoint="http://otel-collector:4318/v1/traces"
)))
trace.set_tracer_provider(provider)
FastAPIInstrumentor.instrument_app(app)
```

### Structured Log Format (ALL services, mandatory)

```json
{
  "timestamp": "2026-05-05T14:23:11.000Z",
  "level": "error",
  "service": "flowos-api",
  "trace_id": "abc123",
  "span_id": "def456",
  "workspace_id": "ws_01j...",
  "user_id": "usr_01j...",
  "request_id": "req_01j...",
  "message": "Automation trigger evaluation failed",
  "error": {
    "type": "AutomationEvaluationException",
    "message": "Action type 'send_webhook' target unreachable",
    "stack": "..."
  },
  "context": {
    "automation_id": "auto_01j...",
    "trigger_type": "status_changed"
  }
}
```

**Rules**:
- No plain-text logs in production. Ever.
- `workspace_id` and `trace_id` on every log line.
- PII (email, name, phone) never logged. Use IDs only.
- Log level discipline: `DEBUG` off in prod, `INFO` for normal ops, `WARN` for recoverable anomalies, `ERROR` for failures requiring attention, `FATAL` for service-stopping events.

---

## 3. Metrics Catalogue (Prometheus)

### Service-Level Metrics (all services)

| Metric | Type | Labels | Alert Threshold |
|--------|------|--------|-----------------|
| `http_request_duration_seconds` | Histogram | service, route, status | p95 > 500ms |
| `http_requests_total` | Counter | service, route, status | error_rate > 1% |
| `http_requests_in_flight` | Gauge | service | > 200 |
| `db_query_duration_seconds` | Histogram | service, query_type | p95 > 100ms |
| `redis_operation_duration_seconds` | Histogram | operation | p95 > 10ms |
| `queue_job_duration_seconds` | Histogram | job_class, queue | p95 > 30s |
| `queue_job_failures_total` | Counter | job_class, queue | > 10/min |
| `queue_depth` | Gauge | queue_name | > 1000 |

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `flowos_active_workspaces` | Gauge | Workspaces with activity in last 7d |
| `flowos_active_websocket_connections` | Gauge | Current Socket.IO connections |
| `flowos_ai_credits_consumed_total` | Counter | By workspace, model, action |
| `flowos_automation_runs_total` | Counter | By workspace, trigger_type, status |
| `flowos_storage_used_bytes` | Gauge | By workspace |
| `flowos_billing_mrr_usd` | Gauge | Live MRR from Stripe |
| `flowos_items_created_total` | Counter | By workspace |
| `flowos_realtime_event_latency_ms` | Histogram | DB write → client delivery |

---

## 4. Alerting Rules

### P0 — Page immediately (PagerDuty, 24/7)

```yaml
# prometheus/alerts/p0.yml
groups:
  - name: p0_critical
    rules:
      - alert: APICompletelyDown
        expr: up{job="flowos-api"} == 0
        for: 1m
        labels: { severity: p0 }
        annotations:
          summary: "Laravel API is DOWN"
          runbook: "https://runbooks.flowos.internal/api-down"

      - alert: DatabasePrimaryDown
        expr: up{job="postgres-primary"} == 0
        for: 30s
        labels: { severity: p0 }
        annotations:
          summary: "PostgreSQL primary is DOWN"
          runbook: "https://runbooks.flowos.internal/db-primary-down"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels: { severity: p0 }
        annotations:
          summary: "Error rate > 5% for 2 minutes"

      - alert: BillingWebhookFailing
        expr: rate(queue_job_failures_total{job_class="ProcessStripeWebhook"}[5m]) > 0
        for: 1m
        labels: { severity: p0 }
        annotations:
          summary: "Stripe webhook processing failing — revenue impact"
```

### P1 — Page within 15 minutes

```yaml
      - alert: APILatencyHigh
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels: { severity: p1 }

      - alert: QueueDepthCritical
        expr: queue_depth{queue_name="automations"} > 5000
        for: 3m
        labels: { severity: p1 }

      - alert: RealtimeServiceDown
        expr: up{job="flowos-realtime"} == 0
        for: 2m
        labels: { severity: p1 }

      - alert: AIServiceDown
        expr: up{job="flowos-ai"} == 0
        for: 3m
        labels: { severity: p1 }
        annotations:
          summary: "AI service down — AI features degraded for all workspaces"
```

### P2 — Slack notification, fix within 1 business day

```yaml
      - alert: StorageUsageWarning
        expr: flowos_storage_used_bytes / flowos_storage_quota_bytes > 0.8
        for: 0m
        labels: { severity: p2 }

      - alert: MeilisearchDown
        expr: up{job="meilisearch"} == 0
        for: 5m
        labels: { severity: p2 }
        annotations:
          summary: "Search degraded — returning empty results"

      - alert: ReplicationLag
        expr: pg_replication_lag_seconds > 30
        for: 2m
        labels: { severity: p2 }
```

---

## 5. Runbooks

### RB-001: Laravel API Completely Down

**Trigger**: `APICompletelyDown` alert fires  
**Impact**: All users cannot access the platform

```
STEP 1 — Verify (2 min)
  curl -f https://api.flowos.app/health
  docker ps | grep flowos-api
  docker logs flowos-api --tail=100

STEP 2 — Quick restart attempt (1 min)
  docker restart flowos-api
  Wait 30s, curl /health again

STEP 3 — If still down: check dependencies
  redis-cli ping                          # Redis OK?
  psql $DATABASE_URL -c "SELECT 1"        # DB OK?
  docker logs flowos-api --tail=500 | grep FATAL

STEP 4 — Roll back if recent deploy
  docker pull ghcr.io/flowos/api:[previous-tag]
  docker-compose up -d api

STEP 5 — Escalate if not resolved in 10 min
  Page: Tech Lead + DevOps Lead
  Post in #incidents: [template below]

INCIDENT TEMPLATE:
  Time: [timestamp]
  Impact: All users, all features
  Current status: [investigating/rolling back/resolved]
  ETA: [time]
  Owner: [name]
```

---

### RB-002: PostgreSQL Primary Down

**Trigger**: `DatabasePrimaryDown` alert fires  
**Impact**: All write operations fail, read traffic served from replica

```
STEP 1 — Verify replica is healthy
  psql $REPLICA_URL -c "SELECT pg_is_in_recovery()"  # Must return 't'
  Check replication lag: SELECT now() - pg_last_xact_replay_timestamp()

STEP 2 — Promote replica if primary unrecoverable (destructive — confirm first)
  pg_ctl promote -D /var/lib/postgresql/data
  Update DATABASE_WRITE_URL in Vault to point to promoted replica
  Restart all Laravel workers: docker restart flowos-api flowos-horizon

STEP 3 — Spin up new replica from backup
  Restore from latest WAL backup (< 5 min RPO)
  Attach as new replica once primary restored

STEP 4 — Post-incident: write WAL gap analysis report

DECISION AUTHORITY: Only Tech Lead or SRE Lead may execute STEP 2
```

---

### RB-003: AI Service Down

**Trigger**: `AIServiceDown` alert fires  
**Impact**: All AI features disabled; core product continues working

```
STEP 1 — Check AI service health
  docker logs flowos-ai --tail=200
  curl http://flowos-ai:8001/health

STEP 2 — Check API key validity
  vault kv get secret/flowos/production/gemini_api_key
  vault kv get secret/flowos/production/anthropic_api_key
  Test directly: curl Gemini/Claude API with stored key

STEP 3 — Check external provider status
  https://status.openai.com / Anthropic status page / Google Cloud status

STEP 4 — Feature flag: disable AI endpoints gracefully
  In Super Admin → Feature Flags → disable ai_task_assistant, ai_document, ai_crm
  Users see "AI features temporarily unavailable" banner

STEP 5 — Restart AI service
  docker restart flowos-ai

STEP 6 — Monitor credit consumption after restart
  Verify no runaway retry loop consuming credits
```

---

### RB-004: Billing Webhook Processing Failure

**Trigger**: `BillingWebhookFailing` alert fires  
**Impact**: Subscription activations/cancellations delayed — revenue impact

```
STEP 1 — Check failed jobs in Horizon
  https://app.flowos.internal/horizon → Failed Jobs tab
  Note: job class, error message, payload

STEP 2 — Verify Stripe webhook signature validation
  Check STRIPE_WEBHOOK_SECRET in Vault matches Stripe dashboard
  Verify no IP blocking on webhook ingestion endpoint

STEP 3 — Replay failed webhooks
  Stripe Dashboard → Webhooks → Failed events → Resend
  OR via Horizon: retry individual failed jobs

STEP 4 — If signature mismatch: rotate secret
  Stripe Dashboard → generate new webhook signing secret
  vault kv put secret/flowos/production/stripe_webhook_secret value=...
  Rolling restart: docker restart flowos-api

STEP 5 — Verify replayed events processed correctly
  Check workspace plan updated in DB
  Check invoice marked paid
```

---

### RB-005: Realtime Service Down

**Trigger**: `RealtimeServiceDown` alert fires  
**Impact**: Real-time updates disabled; users see stale data; collaborative editing broken

```
STEP 1 — Clients automatically poll fallback every 30s (built into SDK)
         — document this is working correctly first before panicking

STEP 2 — Check Node.js process
  docker logs flowos-realtime --tail=200
  docker stats flowos-realtime  # Memory leak?

STEP 3 — Check Redis pub/sub connectivity
  redis-cli subscribe flowos:board:*  # Should receive events from API

STEP 4 — Restart (zero writes lost — events buffered in Redis)
  docker restart flowos-realtime
  Monitor: active_websocket_connections should recover within 60s

STEP 5 — If memory leak: scale horizontally
  docker-compose scale realtime=2
  Caddy sticky sessions already configured for Socket.IO
```

---

## 6. Incident Response Protocol

### Severity Levels

| Severity | Definition | Response Time | War Room |
|----------|-----------|--------------|----------|
| P0 | Complete outage / data loss risk / billing failure | Page immediately | Yes |
| P1 | Major feature broken > 50% users | Page within 15 min | Yes |
| P2 | Feature degraded / minority impacted | Slack + fix within 24h | No |
| P3 | Minor / cosmetic | Ticket, fix in sprint | No |

### Incident Roles

| Role | Responsibility |
|------|---------------|
| **Incident Commander** | Owns communication, decisions, timeline. Never touches code. |
| **Technical Lead** | Diagnoses root cause, executes fix |
| **Comms Lead** | Updates status page + customer emails every 15 min |
| **Scribe** | Documents every action in #incidents Slack channel in real-time |

### Post-Incident (mandatory for P0 + P1)

Within 48 hours of resolution:

1. **Timeline**: exact sequence of events (UTC timestamps)
2. **Root cause**: the actual technical cause, no blame
3. **Impact**: users affected, duration, data integrity status
4. **Detection**: how was it found? Was our alerting adequate?
5. **Resolution**: what fixed it
6. **Action items**: 3–5 specific, assigned, dated improvements
7. **Published to**: `#post-mortems` Slack + internal wiki

---

## 7. Deployment Runbook

### Pre-Deployment Checklist (every production deploy)

```
[ ] CI pipeline is 100% green on the commit being deployed
[ ] No P0 or P1 bugs open against this commit
[ ] Deployment announced in #deployments: "Deploying [service] [tag] at [time] — [change summary]"
[ ] Database migrations reviewed: backward compatible? No column drops without 2-phase?
[ ] Feature flags set correctly for staged rollout
[ ] Rollback tag documented: "Rollback tag: [previous-tag]"
[ ] On-call engineer confirmed available during deploy window
```

### Zero-Downtime Deploy Process

```bash
# 1. Build and push new image
docker build -t ghcr.io/flowos/api:$GIT_SHA services/api/
docker push ghcr.io/flowos/api:$GIT_SHA

# 2. Run DB migrations (must be backward-compatible)
docker run --rm ghcr.io/flowos/api:$GIT_SHA php artisan migrate --force

# 3. Rolling update (Caddy load-balances during transition)
docker service update --image ghcr.io/flowos/api:$GIT_SHA flowos_api

# 4. Health check (automated — deploy aborts if fails)
for i in {1..12}; do
  curl -sf https://api.flowos.app/health && break
  sleep 5
done

# 5. Smoke test critical paths
./scripts/smoke-test.sh production

# 6. Confirm in #deployments: "Deploy complete. Monitoring for 10 min."
```

### Rollback Procedure (< 5 min)

```bash
# Immediate rollback
docker service update --image ghcr.io/flowos/api:[previous-tag] flowos_api

# If DB migration needs reversing (requires migration written with down() method)
docker run --rm ghcr.io/flowos/api:[previous-tag] php artisan migrate:rollback

# Confirm rollback in #deployments
```

---

## 8. SLO / Error Budget Tracking

| SLO | Target | Measurement | Error Budget (30-day) |
|-----|--------|------------|----------------------|
| API availability | 99.9% | Uptime Robot / Blackbox exporter | 43.8 min/month |
| API p95 latency < 500ms | 99% of requests | Prometheus histogram | 1% of requests |
| Realtime event delivery < 200ms | 99% of events | Custom metric | 1% of events |
| Successful payment processing | 99.95% | Webhook success rate | 2.2 min/month |
| Data durability | 99.999% | Backup + restore drill | Near-zero |

**Error budget burn rate alerts**:
- > 5% burn in 1 hour → P1 alert (fast burn)
- > 2% burn in 6 hours → P2 alert (slow burn)
- Budget exhausted → freeze all non-critical deploys until next period

---

## 9. Backup & Recovery

### Backup Schedule

| Data | Method | Frequency | Retention | RTO | RPO |
|------|--------|-----------|-----------|-----|-----|
| PostgreSQL | WAL archiving + pg_dump | Continuous WAL + daily snapshot | 30 days | 30 min | 5 min |
| Redis | RDB snapshot + AOF | Every 15 min | 7 days | 5 min | 15 min |
| MinIO/R2 files | S3 replication to secondary region | Real-time | 90 days | 15 min | Near-zero |
| ClickHouse | Table backup job | Daily | 30 days | 1 hour | 24 hours |
| Meilisearch | Re-index from PostgreSQL | On restore | N/A | 1 hour | N/A |
| Vault | Vault snapshot | Daily | 30 days | 30 min | 24 hours |

### Monthly Restore Drill (mandatory)

```
1. Spin up isolated restore environment
2. Restore PostgreSQL from latest backup
3. Verify: row count matches production within 0.1%
4. Verify: RLS policies functional on restored DB
5. Verify: application connects and serves requests
6. Document: actual RTO achieved vs. target
7. If RTO exceeded: incident ticket + fix before next drill
```

---

*Owner: SRE Lead*  
*Cross-reference: QA_STRATEGY.md (chaos tests), PHASE_PLAN.md (L4 maturity gate at Phase 4)*

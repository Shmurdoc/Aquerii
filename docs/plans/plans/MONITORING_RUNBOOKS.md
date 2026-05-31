# MONITORING RUNBOOKS — SigNoz Dashboards, Alert Rules & Incident Response

**Version**: 2.0  
**Status**: AUTHORITATIVE  
**Owner**: Team Alpha (DevOps) + RUFLO performance-analyzer  

---

## 1. Observability Stack

| Tool | Purpose | Port | Owner |
|------|---------|------|-------|
| **SigNoz** | Traces + Metrics + Logs | 9000 (UI), 9090 (OTLP) | Team Alpha |
| **Zulip** | ChatOps alerts | 9300 | Team Alpha |
| **Homarr** | Operations dashboard | 8003 | Team Delta |
| **Docker health checks** | Container health | internal | CI/CD |

---

## 2. OpenTelemetry Instrumentation

Every service MUST emit traces via OpenTelemetry. Here is the Gateway configuration:

```python
# services/gateway/middleware/tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

def setup_telemetry(app):
    provider = TracerProvider(
        resource=Resource.create({
            SERVICE_NAME: "mine-gateway",
            SERVICE_VERSION: "1.0.0",
            DEPLOYMENT_ENVIRONMENT: settings.ENVIRONMENT,
        })
    )
    provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint="http://signoz:9090")
        )
    )
    trace.set_tracer_provider(provider)
    
    # Auto-instrument FastAPI, SQLAlchemy, Redis
    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument()
    RedisInstrumentor().instrument()
```

### Structured Logging Standard

```python
# All services log in this format:
import structlog

logger = structlog.get_logger()

logger.info(
    "event_processed",
    event_id="uuid-xxx",
    event_type="inventory.stock.low",
    source_service="inventree",
    part_id=123,
    processing_time_ms=45,
    trace_id=trace.get_current_span().get_span_context().trace_id,
)

# This emits:
# {
#   "timestamp": "2026-05-04T10:00:00Z",
#   "level": "info",
#   "service": "mine-gateway",
#   "message": "event_processed",
#   "event_id": "uuid-xxx",
#   "event_type": "inventory.stock.low",
#   "source_service": "inventree",
#   "part_id": 123,
#   "processing_time_ms": 45,
#   "trace_id": "abc123..."
# }
```

---

## 3. Custom Metrics

```python
# services/gateway/middleware/metrics.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest

# Request metrics
http_requests_total = Counter(
    'mine_http_requests_total',
    'Total HTTP requests',
    ['service', 'method', 'endpoint', 'status_code']
)

http_request_duration_seconds = Histogram(
    'mine_http_request_duration_seconds',
    'HTTP request duration',
    ['service', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Business metrics
events_processed_total = Counter(
    'mine_events_processed_total',
    'Total events processed',
    ['event_type', 'status']  # status: success | failed | dlq
)

dlq_pending_gauge = Gauge(
    'mine_dlq_pending_count',
    'Number of events in DLQ'
)

auto_po_created_total = Counter(
    'mine_auto_po_created_total',
    'Auto-created purchase orders'
)

stock_sync_duration = Histogram(
    'mine_stock_sync_duration_seconds',
    'Stock sync operation duration'
)

circuit_breaker_state = Gauge(
    'mine_circuit_breaker_state',
    'Circuit breaker state (0=closed, 1=half-open, 2=open)',
    ['service']
)

# Expose for Prometheus scraping
@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

---

## 4. SigNoz Dashboard Panels

### Dashboard 1: System Health Overview

| Panel | Query | Alert |
|-------|-------|-------|
| Overall health | Count of `service_health = unhealthy` | > 0 → CRITICAL |
| Gateway RPS | Rate of `mine_http_requests_total` | - |
| Gateway P99 Latency | P99 of `mine_http_request_duration_seconds` | > 2s → WARN, > 5s → CRITICAL |
| Total Error Rate | Rate of 5xx / total requests | > 2% → WARN, > 5% → CRITICAL |
| DLQ Depth | `mine_dlq_pending_count` | > 10 → WARN, > 50 → CRITICAL |
| Active Circuit Breakers | Count of `mine_circuit_breaker_state = 2` | > 0 → WARN |

### Dashboard 2: Inventory Operations

| Panel | Query | Alert |
|-------|-------|-------|
| Low Stock Events/hr | Rate of `mine_events_processed_total{event_type="inventory.stock.low"}` | - |
| Auto-PO Rate | Rate of `mine_auto_po_created_total` | - |
| Failed PO Creations | Rate of `mine_events_processed_total{event_type="inventory.stock.low", status="failed"}` | > 1/hr → WARN |
| Stock Sync Duration | P95 of `mine_stock_sync_duration_seconds` | > 5s → WARN |
| InvenTree Health | `service_health{service="inventree"}` | unhealthy → CRITICAL |

### Dashboard 3: Financial Operations

| Panel | Query | Alert |
|-------|-------|-------|
| Invoices Created Today | Count of `mine_events_processed_total{event_type="erp.invoice.created"}` | - |
| Deal-to-Invoice P99 | P99 of deal.won → invoice.created latency | > 30s → WARN |
| AureusERP Health | `service_health{service="aureusrep"}` | unhealthy → CRITICAL |
| Payment Failures | Rate of payment processing errors | > 0 → WARN |

### Dashboard 4: Database & Infrastructure

| Panel | Query | Alert |
|-------|-------|-------|
| DB Pool Utilization | `db_pool_used / db_pool_size` per service | > 80% → WARN, > 95% → CRITICAL |
| DB Query P99 | P99 slow query time | > 1s → WARN |
| Redis Memory | `redis_memory_used_bytes` | > 80% capacity → WARN |
| Redis Hit Rate | `redis_keyspace_hits / (hits + misses)` | < 80% → WARN |
| Disk Usage | `node_filesystem_avail_bytes` | < 20% free → WARN, < 10% → CRITICAL |
| Container Restarts | Count of container restarts in last hour | > 0 → WARN |

---

## 5. Alert Rules

### Zulip Alert Configuration

```python
# services/gateway/services/alerting.py

ALERT_CHANNELS = {
    'critical': '#alerts-critical',  # P0/P1 - pages on-call
    'warning': '#alerts-warning',    # P2 - team notified
    'info': '#system-info',          # P3 - informational
    'deployments': '#deployments',   # Deploy events
    'inventory': '#inventory',       # Inventory events
    'finance': '#finance',           # Finance events
}

async def send_alert(severity: str, title: str, message: str, metadata: dict = {}):
    channel = ALERT_CHANNELS.get(severity, '#alerts-warning')
    
    content = f"""
**[{severity.upper()}] {title}**
{message}

```
{json.dumps(metadata, indent=2)}
```

Time: {datetime.utcnow().isoformat()}
Environment: {settings.ENVIRONMENT}
Dashboard: http://signoz:9000/dashboards/system-health
    """.strip()
    
    await zulip_client.send_message(stream=channel, content=content)
```

### Alert Rule Definitions

```yaml
# configs/monitoring/alert_rules.yaml

groups:
  - name: system_health
    rules:
      - alert: ServiceDown
        expr: service_health{job="mine-system"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.service }} is down"
          action: "Check container logs: docker logs mine-{{ $labels.service }}"
          runbook: "See MONITORING_RUNBOOKS.md #8.1"

      - alert: HighErrorRate
        expr: rate(mine_http_requests_total{status_code=~"5.."}[5m]) / rate(mine_http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Gateway error rate {{ $value | humanizePercentage }} exceeds 5%"
          action: "Check SigNoz error traces"
          runbook: "See MONITORING_RUNBOOKS.md #8.2"

      - alert: HighLatency
        expr: histogram_quantile(0.99, mine_http_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency {{ $value }}s exceeds 2s threshold"

      - alert: DLQGrowing
        expr: mine_dlq_pending_count > 50
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "DLQ has {{ $value }} pending events (threshold: 50)"
          action: "Review DLQ at http://gateway:8000/api/admin/dlq"

      - alert: CircuitBreakerOpen
        expr: mine_circuit_breaker_state > 1
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker OPEN for {{ $labels.service }}"
          action: "Investigate {{ $labels.service }} health immediately"

      - alert: DBPoolExhausted
        expr: db_pool_used / db_pool_size > 0.95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "DB pool {{ $value | humanizePercentage }} full for {{ $labels.service }}"
```

---

## 6. Runbook Library

### Runbook 8.1: Service Down

```
TRIGGER: ServiceDown alert fires

IMMEDIATE ACTIONS:
1. Check container status:
   docker ps | grep mine-{service}
   
2. Check container logs:
   docker logs mine-{service} --tail 100
   
3. Check resource limits:
   docker stats mine-{service} --no-stream
   
4. Try manual restart (1x only):
   docker restart mine-{service}
   
5. Wait 60 seconds and re-check health:
   curl -sf http://{service}:{port}/health

IF STILL DOWN:
6. Check PostgreSQL connectivity:
   docker exec mine-{service} pg_isready -h postgres-{service}
   
7. Check disk space:
   df -h /var/lib/docker
   
8. Check for OOM kill:
   dmesg | grep oom | tail -20

ESCALATE TO LEAD if service still down after 15 min.
Post updates to #alerts-critical every 15 min.
```

### Runbook 8.2: High Error Rate

```
TRIGGER: HighErrorRate alert fires (> 5% errors)

DIAGNOSIS:
1. Open SigNoz → Traces → filter by error=true, last 15min
2. Identify top error message
3. Check if specific endpoint or global

COMMON CAUSES & FIXES:
- "Connection refused" to upstream service:
  → Check service health (Runbook 8.1)
  → Circuit breaker may need manual reset
  
- "Timeout" errors:
  → Check DB pool utilization (Dashboard 4)
  → Check if DB query running slow (slow query log)
  
- "401 Unauthorized":
  → JWT secret may have rotated
  → Check Vault for current secret version
  
- "422 Validation Error":
  → Check recent deployments for schema change
  → Revert if introduced by new deploy

ROLLBACK CRITERIA:
If error rate doesn't decrease within 15 min → trigger rollback
See ROLLBACK_PLAN.md for rollback steps.
```

### Runbook 8.3: DLQ Growing

```
TRIGGER: DLQ > 10 events (warning), > 50 events (critical)

DIAGNOSIS:
1. Check DLQ summary: GET /api/admin/dlq/summary
2. Identify most common error type
3. Check which service is failing

ACTIONS BY CAUSE:
- "ERPNext API timeout": ERPNext is slow/down
  → Check AureusERP health
  → If confirmed down, hold DLQ (don't replay yet)
  → Fix AureusERP, then bulk-replay DLQ
  
- "Schema validation failed": Event format mismatch
  → Check recent deploy for schema change
  → Fix schema, manually fix malformed events
  → Replay fixed events
  
- "Duplicate key violation": Idempotency not working
  → Check idempotency_key format
  → Mark as ignored if truly duplicate

BULK REPLAY:
POST /api/admin/dlq/replay-all?event_type=inventory.stock.low
(Only when underlying cause is fixed!)
```

### Runbook 8.4: Database Connection Pool Exhausted

```
TRIGGER: DB pool > 95% utilized for > 2 min

IMMEDIATE (buys time):
1. Identify long-running queries:
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active' AND duration > interval '30 seconds'
   ORDER BY duration DESC;
   
2. Kill blocking queries (if > 5 min old):
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE duration > interval '5 minutes' AND state = 'active';

SUSTAINABLE FIX:
3. Increase pool size (temporary):
   Update config: pool_size=30 (from 20)
   Restart gateway: docker restart mine-gateway
   
4. Find root cause:
   - N+1 query in new code?
   - Missing index causing full table scans?
   - Loop creating many small queries?
   
5. Fix root cause and revert pool_size to 20
```

### Runbook 8.5: Disk Space Low

```
TRIGGER: < 20% free disk

IMMEDIATE CLEANUP:
1. Docker cleanup:
   docker system prune -f  # Remove unused containers/images
   docker volume prune -f   # Remove unused volumes (CAREFUL!)
   
2. Log rotation:
   truncate -s 0 /var/lib/docker/containers/*/logs/*.log
   
3. Archive old backups:
   # Move backups older than 7 days to cold storage
   find /backups -mtime +7 -name "*.dump" -exec mv {} /cold-storage/ \;

ESCALATE if < 10% free after cleanup.
```

---

## 7. Weekly Health Check (Every Monday 08:00 UTC)

Automated script run by agency-agents `infra-monitor`:

```bash
#!/bin/bash
# scripts/weekly-health-check.sh

echo "=== MINE SYSTEM WEEKLY HEALTH CHECK ===" 
echo "Date: $(date)"

# Check all service health endpoints
services=("gateway:8000" "inventree:8001" "aureusrep:8002" "homarr:8003" 
          "twenty-front:3000" "paperless:8010" "yetiforce:8080")

for svc in "${services[@]}"; do
  host=$(echo $svc | cut -d: -f1)
  port=$(echo $svc | cut -d: -f2)
  if curl -sf "http://$host:$port/health" > /dev/null 2>&1; then
    echo "✅ $host: HEALTHY"
  else
    echo "❌ $host: UNHEALTHY"
  fi
done

# Check DLQ
dlq_count=$(curl -s http://gateway:8000/api/admin/dlq/summary | jq '.pending_count')
echo "DLQ pending: $dlq_count"

# Check disk
df -h / | awk 'NR==2 {print "Disk: " $5 " used (" $4 " free)"}'

# Check DB sizes
psql -h postgres-gateway -U gateway -c "SELECT pg_size_pretty(pg_database_size(datname)) as size, datname FROM pg_database ORDER BY pg_database_size(datname) DESC;"

# Send report to Zulip
curl -X POST http://zulip:9300/api/v1/messages \
  -d "type=stream&to=system-info&topic=Weekly Health Check&content=$(cat /tmp/health_report.txt)"
```

---

*Owner: Team Alpha (DevOps) + RUFLO performance-analyzer*  
*Review: Update when new services added or thresholds need adjustment*

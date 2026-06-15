# Degraded Mode — Fallback & Resilience Strategy

## What Happens When Redis Is Down

Redis is used for: queuing (`QUEUE_CONNECTION=redis`), caching (`CACHE_STORE=redis`), sessions (`SESSION_DRIVER=redis`), and realtime event broadcasting (pub/sub).

### Queue Fallback
- **Config:** `config/queue.php` — `fallback` key reads `QUEUE_CONNECTION_FALLBACK` env (default: `database`)
- **Behavior:** When Redis is unreachable, set `QUEUE_CONNECTION=database` to use the `jobs` PostgreSQL table as the queue driver
- **Impact:** Jobs still process but at reduced throughput (polling vs. blocking pop). The `notifications`, `ai`, `automations`, and `indexing` queues continue with database-backed persistence. No job loss.
- **Env switch:** `QUEUE_CONNECTION=database`

### Cache Fallback
- **Config:** `config/cache.php` — `fallback` key reads `CACHE_STORE_FALLBACK` env (default: `file`)
- **Behavior:** Set `CACHE_STORE=file` or `CACHE_STORE=array` to bypass Redis
- **Impact:** File cache persists across requests but is slower. Array cache is per-request only (resets between requests). Slightly higher DB load for cache-miss queries. Rate limiting and throttle counters reset with `array` driver.
- **Env switch:** `CACHE_STORE=file` or `CACHE_STORE=array`

### Session Fallback
- **Config:** `config/session.php` — `fallback_driver` key reads `SESSION_DRIVER_FALLBACK` env (default: `file`)
- **Behavior:** Set `SESSION_DRIVER=file` to store sessions to disk (`storage/framework/sessions`)
- **Impact:** Session data persists but is not shared across multiple app instances. Requires sticky sessions or a shared filesystem (NFS) in multi-instance deployments.
- **Env switch:** `SESSION_DRIVER=file`

### Summary Recovery Checklist
1. Verify Redis service: `docker compose ps redis`
2. Check Redis logs: `docker compose logs redis`
3. If Redis is down, set fallback env vars and restart app containers
4. Investigate root cause (OOM, config change, network partition)

---

## What Happens When S3 Is Down

S3 is used for file storage via the `s3` disk in `config/filesystems.php`. Falls back to `local` disk.

### File Storage Fallback
- **Config:** Set `FILESYSTEM_DISK=local` to serve files from local disk
- **Behavior:** New uploads write to `storage/app/private/`. Existing S3 files are still referenced by their S3 URLs until S3 recovers.
- **Impact:** Files are not shared across instances. Local disk space must be monitored. Not suitable for multi-instance deployments without a shared volume (NFS / EBS).
- **Env switch:** `FILESYSTEM_DISK=local`

### S3-Specific Considerations
- Generated document exports (PDFs, CSVs) fall back to local disk and are served via the app, not direct S3 URLs
- Avatar and cover image uploads continue working (stored locally)
- S3-reliant features (signed URLs, large file streaming) degrade gracefully

---

## What Happens When WebSocket Fails

WebSocket connections (Socket.IO) are used for realtime notifications, room events, and live updates.

### Client-Side Reconnection
- **File:** `services/web/src/lib/socket.ts`
- **Behavior:** Automatic reconnection with exponential backoff: 10s → 30s → 60s → 5min (max)
- **Fallback:** Transports degrade from `websocket` to `polling` (long-polling HTTP) automatically
- **Token refresh:** After 30s of disconnect, or 3+ failed connect attempts, the client refreshes its auth token and creates a fresh socket

### Polling Fallback for Critical Operations
- Critical operations (notifications, alert acknowledgments) register fallback handlers via `registerCriticalFallback()`
- When WebSocket is disconnected, fallback handlers execute immediately
- Handlers typically use REST API calls as a polling substitute

### Escalation
- If a generic disconnect exceeds 30s and the socket cannot re-establish, the client forces a reconnection cycle
- If all reconnection attempts fail, the user is redirected to login

### WebSocket Reverb Server Recovery
1. Check Reverb service: `docker compose ps reverb`
2. Verify Redis pub/sub is healthy (Reverb depends on Redis)
3. Restart Reverb: `docker compose restart reverb`
4. Clients reconnect automatically with backoff

---

## What Happens When DB Connections Are Exhausted

PostgreSQL connection pool exhaustion occurs when all available database connections are in use (idle in transaction, waiting, or active).

### PgBouncer Configuration
- **Config:** `config/database.php` — `pgbouncer` section configures PgBouncer as a lightweight connection pooler
- **Recommended settings:**
  - `pool_mode`: `transaction` (connections released after each transaction, not per-request)
  - `default_pool_size`: 25 (per-database connection limit in PgBouncer)
  - `max_client_conn`: 100 (total client connections PgBouncer accepts)
  - `server_idle_timeout`: 600s (close backend connections after idle)
  - `query_timeout`: 0 (no query timeout — adjust downward if needed)

### Connection Pooling Strategy
| Setting | Value | Rationale |
|---------|-------|-----------|
| `DB_POOL_MIN` | 2 | Minimum pooled connections |
| `DB_POOL_MAX` | 20 | Maximum per-app connections |
| `DB_POOL_IDLE_TIMEOUT` | 600s | Release idle connections after 10min |
| `DB_POOL_MAX_LIFETIME` | 3600s | Recycle connections after 1 hour |

### Prevention
- Always use PgBouncer in production (`PGBOUNCER_ENABLED=true`)
- Set conservative `DB_POOL_MAX` (20) to avoid saturating Postgres `max_connections`
- Monitor connection count via:
  - `SELECT count(*) FROM pg_stat_activity WHERE datname = 'aquerii';`
  - `SHOW max_connections;`
- Alert on connection count > 80% of max_connections

### Recovery
1. Kill idle-in-transaction connections:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
   AND state_change < NOW() - INTERVAL '5 minutes';
   ```
2. If PgBouncer is not in use, configure it immediately
3. Restart the app containers to release orphaned connections
4. Add `pgbouncer` service to docker-compose if not already present

---

## Monitoring Degradation

All degraded states should produce:
- Error-level logs in the app
- Metrics reported to the observability system
- Alerts to the operations team

### Key Metrics
| Metric | Where | Degraded Threshold |
|--------|-------|--------------------|
| Redis reachability | App health check | > 2 consecutive failures |
| Cache hit rate | Cache driver | < 50% (possible fallback active) |
| Queue job lag | Horizon / Laravel | > 5 minutes backlog |
| Realtime connections | Socket.IO metrics | 0 connected clients |
| DB connection count | `pg_stat_activity` | > 80% of `max_connections` |
| Push notification success | AlertService | < 80% delivery rate |

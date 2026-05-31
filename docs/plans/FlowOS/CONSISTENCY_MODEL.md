# FlowOS — Consistency Model

**Version**: 1.0  
**Status**: AUTHORITATIVE  
**Owner**: Tech Lead  
**Purpose**: Every engineer must understand exactly how data flows, where it is authoritative, what happens when things fail, and how the system reaches a consistent state. If you do not understand this document, you should not write a line of code that touches state.

---

## 1. The Golden Rule

**PostgreSQL is the source of truth for all business data.**

Redis is cache. ClickHouse is analytics. Meilisearch is search index. ChromaDB is embeddings. None of these are authoritative. If they disagree with PostgreSQL, PostgreSQL wins. They are all derived from PostgreSQL and can be rebuilt from it.

---

## 2. Write Path (authoritative)

Every state change follows this exact path. No exceptions.

```
CLIENT
  │
  │ 1. Optimistic update applied in Pinia/Zustand store (client-side only)
  │
  ▼
LARAVEL API
  │
  │ 2. Validate request (form request rules)
  │ 3. Check idempotency key (Redis) — if seen before: return cached response
  │ 4. Check authorization (Policy gate)
  │ 5. Check quota (storage/seats/automations) — if exceeded: 402 error
  │ 6. BEGIN TRANSACTION
  │    a. Write to PostgreSQL (authoritative)
  │    b. Write to realtime_events (durable event log, same transaction)
  │    c. COMMIT
  │ 7. Store idempotency response in Redis (24-hour TTL)
  │ 8. Publish to Redis pub/sub (ephemeral broadcast)
  │ 9. Dispatch async jobs (non-blocking):
  │       - UpdateMeilisearchIndex
  │       - EvaluateAutomationTriggers
  │       - UpdateClickHouseAnalytics
  │       - UpdateAIEmbedding (if doc/item content changed)
  │
  ▼
CLIENT (via Socket.IO)
  │
  │ 10. Realtime service delivers event to all connected clients
  │ 11. Other clients apply update from event payload
  │     Original client: deduplicates (already applied optimistically)
  │
  ▼
DERIVED STORES (async, eventual consistency)
  - Meilisearch: updated within seconds (Horizon queue)
  - ClickHouse: updated within seconds (Horizon queue)
  - ChromaDB: updated within minutes (background job)
```

**Critical**: Steps 6a and 6b are in the SAME database transaction. If the transaction fails, both are rolled back. The event log is never ahead of or behind the main data. They are always consistent with each other.

---

## 3. Idempotency

Every POST/PUT/PATCH/DELETE requires an `Idempotency-Key` header (UUID, client-generated).

```php
// app/Http/Middleware/IdempotencyMiddleware.php
public function handle(Request $request, Closure $next): Response
{
    $key = $request->header('Idempotency-Key');
    abort_if(!$key, 400, 'Idempotency-Key header is required');
    abort_if(!Str::isUlid($key) && !Str::isUuid($key), 400, 'Invalid Idempotency-Key format');

    $cacheKey = "idempotency:{$request->user()->id}:{$key}";

    // Check cache — if seen, return stored response immediately
    if ($cached = Redis::get($cacheKey)) {
        $stored = json_decode($cached, true);
        
        // Detect payload mismatch (same key, different body = 409)
        if ($stored['payload_hash'] !== hash('sha256', $request->getContent())) {
            abort(409, 'Idempotency key reused with different payload');
        }
        
        return response()->json($stored['response'], $stored['status']);
    }

    // Process request
    $response = $next($request);

    // Cache response for 24 hours
    Redis::setex($cacheKey, 86400, json_encode([
        'payload_hash' => hash('sha256', $request->getContent()),
        'response'     => $response->getData(true),
        'status'       => $response->getStatusCode(),
    ]));

    return $response;
}
```

**Guarantees**:
- Retried requests (network timeout, client retry) are safe — no duplicate entities created
- Webhooks from Stripe/PayFast replayed → same outcome, no duplicate billing events

---

## 4. Optimistic Locking (Concurrent Edits)

For item updates, last-write-wins is acceptable for most fields (title, column values). For position reordering, optimistic locking prevents position collisions.

```php
// Item model uses version column
Schema::table('items', function (Blueprint $table) {
    $table->unsignedBigInteger('version')->default(1);
});

// PATCH /items/{id} with optional version check
if ($request->has('expected_version')) {
    $updated = Item::where('id', $id)
        ->where('version', $request->expected_version)
        ->update([...$changes, 'version' => DB::raw('version + 1')]);

    if ($updated === 0) {
        return response()->json([
            'error' => [
                'code' => 'CONCURRENT_EDIT',
                'message' => 'Item was modified by another user. Please reload.',
                'current_version' => Item::find($id)->version,
            ]
        ], 409);
    }
}
```

---

## 5. Derived Store Consistency

### Meilisearch (Search Index)

- **Lag**: typically < 5 seconds behind PostgreSQL
- **Recovery**: if index falls behind or corrupts → `php artisan search:reindex` rebuilds from PostgreSQL
- **Failure behavior**: search returns empty with `search_unavailable: true` flag — does not crash the API
- **Trust level**: never used to drive business logic — only search UI
- **Stale reads**: acceptable — user searches for an item just created, does not find it in 2 seconds → that is acceptable UX

### ClickHouse (Analytics)

- **Lag**: typically < 10 seconds
- **Recovery**: events re-dispatched from `realtime_events` table up to 7 days back
- **Failure behavior**: analytics dashboard shows "data delayed" banner — does not affect product functionality
- **Trust level**: never authoritative — never used for billing, quotas, or permissions

### ChromaDB (AI Embeddings)

- **Lag**: typically < 5 minutes (background job queue)
- **Recovery**: full re-embedding job per workspace: `python artisan rag:reindex {workspace_id}`
- **Failure behavior**: AI knowledge base queries return empty — does not affect other features
- **Trust level**: never authoritative

### Redis Cache

- **What is cached**: workspace plan details, user permissions, quota counters (atomic), session data
- **Invalidation**: explicit on write (not TTL-only). Every write to workspace plan → delete cached plan object.
- **Quota counters**: stored as Redis atomic integers (INCR/DECR). Source of truth for **rate enforcement**. PostgreSQL is reconciled nightly. If Redis fails → quota enforcement falls back to PostgreSQL check (slower but correct).

```php
// Quota counter pattern
Redis::incr("quota:automations:{$workspaceId}:{$month}");
Redis::expire("quota:automations:{$workspaceId}:{$month}", 33 * 86400); // 33-day TTL
```

---

## 6. Automation Engine Consistency

Automations are event-driven. They must not cause duplicate side effects and must handle failures gracefully.

### Execution Flow

```
Item updated → automation trigger evaluated
  ↓
AutomationRun record CREATED (status = 'pending') — in same DB transaction as item update
  ↓
Job dispatched: EvaluateAutomationActions (Horizon queue: 'automations')
  ↓
For each action:
  - Try execute
  - On success: log result to automation_run_actions table
  - On failure: retry up to 3 times (exponential backoff: 1m, 5m, 15m)
  - After 3 failures: AutomationRun status = 'failed', alert workspace owner
  ↓
AutomationRun status = 'completed'
```

**Idempotency**: `AutomationRun.id` is passed through the job chain. If job is re-queued (Redis failure, worker crash), the run ID already exists → duplicate detection prevents double execution.

```php
// app/Jobs/EvaluateAutomationActions.php
public function handle(): void
{
    // Idempotency check — if run already completed, skip
    $run = AutomationRun::find($this->runId);
    if ($run->status === 'completed') return;
    
    // Mark in-progress
    $run->update(['status' => 'running', 'started_at' => now()]);
    
    foreach ($this->automation->actions as $action) {
        // Per-action idempotency key
        $actionKey = "automation_action:{$run->id}:{$action->id}";
        if (Redis::exists($actionKey)) continue;  // Already executed
        
        $this->executeAction($action);
        Redis::setex($actionKey, 86400 * 7, '1');
    }
}
```

---

## 7. Billing Consistency

Billing is the most critical consistency domain. Payment events must not be lost or duplicated.

### Stripe Webhook Processing

```
Stripe sends event
  ↓
POST /webhooks/stripe
  ↓
Verify signature (Stripe-Signature header)
  ↓
Idempotency check: billing_events table by stripe_event_id
  (if already processed: return 200 immediately — Stripe will stop retrying)
  ↓
BEGIN TRANSACTION
  a. Insert billing_events record (stripe_event_id UNIQUE constraint prevents duplicate)
  b. Update workspace subscription state
  c. COMMIT
  ↓
Dispatch: SendBillingConfirmationEmail (async, outside transaction)
```

**Stripe retry behavior**: Stripe retries webhooks for 72 hours on non-2xx response. Our idempotency check ensures retries are safe. We return 200 immediately after signature verification even if downstream processing fails — failed processing queued separately for retry.

### Seat Count Sync

```
Member added to workspace
  ↓
WorkspaceMember created in PostgreSQL
  ↓
Job: SyncStripeSubscriptionQuantity
  ↓
Stripe API: update subscription.quantity to current member count
  ↓
On Stripe API error: retry 3x, then alert Super Admin
  (workspace continues working — seat count desync is non-critical, reconciled next billing cycle)
```

---

## 8. Failure Modes & Recovery Matrix

| Component fails | Impact | Auto-recovery | Manual recovery |
|----------------|--------|--------------|-----------------|
| Redis (cache) | Quota falls to DB check (slow), sessions lost, pub/sub fails | Restart Redis — reconnects automatically | Flush corrupted keys if needed |
| Redis (pub/sub) | Realtime events not delivered | Clients poll missed events from DB on reconnect | — |
| Meilisearch | Search returns empty | Feature flag degrades gracefully | `php artisan search:reindex` |
| AI service | AI features disabled | Feature flags auto-disable via health check | Restart service; verify API keys |
| ClickHouse | Analytics stale | Analytics shows "delayed" banner | Re-dispatch events from `realtime_events` |
| Horizon worker crash | Jobs queue up, not executed | Workers restart automatically (Docker restart policy) | Clear stuck jobs manually in Horizon UI |
| DB replica lag > 30s | Reads from primary (higher load) | Alert fires; Caddy routes read traffic to primary | Investigate replication issue |
| Object storage (MinIO/R2) | File uploads fail, file downloads fail | 503 with retry guidance | Check storage service health |
| Node.js realtime crash | No live updates | Clients auto-reconnect; catch-up from DB | `docker restart flowos-realtime` |

---

## 9. Data Migration Rules

Every schema change follows a 2-phase approach (zero-downtime):

**Phase 1 (backwards compatible)**:
- Add new column as nullable
- Deploy new code that writes to both old and new column
- Backfill new column for existing rows (background job)

**Phase 2 (cleanup)**:
- Deploy code that reads from new column only
- Drop old column (only after Phase 2 is stable for ≥ 1 week)

**Forbidden migrations** (require planned maintenance window, announced 7 days in advance):
- Rename column or table
- Change column type
- Add non-nullable column without default
- Drop column that is still referenced in code

---

*Owner: Tech Lead*  
*Cross-reference: ARCHITECTURE.md §2, DATABASE_SCHEMA.md, REALTIME.md §2, OPERATIONAL_MATURITY.md §9*

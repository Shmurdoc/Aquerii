# BG-06: Offline Mode with Sync

**Status:** NOT IMPLEMENTED  
**Priority:** Medium  
**Complexity:** HIGH  
**Dependencies:** None (greenfield)

---

## 1. What the Feature Is

Offline-first support allowing users to continue working without an internet connection. Changes are queued locally and synced when connectivity resumes. The system handles conflict resolution when the same entity is modified both offline and by another user/server process.

This is a **full CRDT-lite pattern**: local mutations are stamped with an operation log, pushed as a batch on reconnect, and reconciled server-side.

## 2. Why It's Missing

- **No offline detection infrastructure** — the frontend has zero awareness of `navigator.onLine` or service worker registration. All API calls assume a live connection.
- **No operation log** — mutations are performed directly via HTTP requests. There is no intermediate queue, no retry mechanism, no operation ordering.
- **No conflict resolution** — the backend has no concept of "this might be a stale write." It processes requests in isolation, last-write-wins by default, with no version checking or merge logic.
- **No sync endpoint** — the entire API surface is request-response. There is no batch endpoint for replaying offline operations.

The assumption has always been "everyone has WiFi." That assumption breaks on construction sites, manufacturing floors, warehouses, subways, and airplanes — which are prime NexusFlow use cases.

## 3. Full Backend Specification

### 3.1 Models

```csharp
// SyncOperation — each atomic change made offline
public class SyncOperation
{
    public Guid Id { get; set; }                          // PK
    public Guid UserId { get; set; }                      // Who made the change
    public string EntityType { get; set; } = string.Empty; // "Task", "Comment", "Project"
    public Guid EntityId { get; set; }                    // The affected entity
    public string Operation { get; set; } = string.Empty;  // "create", "update", "delete"
    public string Payload { get; set; } = string.Empty;    // JSON diff or full payload
    public int Version { get; set; }                      // Optimistic concurrency version at time of mutation
    public string Status { get; set; } = "pending";       // pending | applied | conflicted | superseded
    public DateTime CreatedAt { get; set; }
    public DateTime? AppliedAt { get; set; }
    public string? ConflictMessage { get; set; }          // Human-readable conflict explanation
}

// SyncBatch — group of operations pushed together
public class SyncBatch
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? DeviceId { get; set; }                   // Identify if same user on multiple devices
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int OperationsCount { get; set; }
    public string Status { get; set; } = "processing";    // processing | completed | failed
}

// SyncConflict — server-side conflict record
public class SyncConflict
{
    public Guid Id { get; set; }
    public Guid OperationId { get; set; }                 // Links to the operation that conflicted
    public Guid UserId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string ServerValue { get; set; } = string.Empty;  // Current server state
    public string LocalValue { get; set; } = string.Empty;   // What the user tried to sync
    public string Resolution { get; set; } = "unresolved";   // unresolved | accept_server | accept_local | merged
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
```

**Migrations required:** 3 new tables, foreign keys on `UserId`, indexes on `(UserId, CreatedAt)` and `(EntityType, EntityId, Version)`.

### 3.2 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/sync/push` | Push a batch of operations from the client |
| POST | `/api/sync/pull` | Pull changes since a given timestamp |
| GET | `/api/sync/conflicts` | List unresolved conflicts for current user |
| POST | `/api/sync/conflicts/{id}/resolve` | Resolve a conflict (accept_server, accept_local, merged) |
| GET | `/api/sync/status` | Returns server timestamp + current schema version |

**POST /api/sync/push**

Request:
```json
{
  "deviceId": "uuid",
  "startedAt": "2026-05-01T10:00:00Z",
  "operations": [
    {
      "entityType": "Task",
      "entityId": "uuid",
      "operation": "update",
      "version": 3,
      "payload": "{\"title\": \"Updated title\", \"status\": \"in_progress\"}"
    }
  ]
}
```

Response (201):
```json
{
  "batchId": "uuid",
  "applied": 8,
  "conflicted": 2,
  "failed": 0,
  "serverTimestamp": "2026-05-01T10:00:05Z",
  "conflicts": [
    {
      "operationId": "uuid",
      "entityType": "Task",
      "entityId": "uuid",
      "serverValue": "{\"title\": \"Different title\", \"status\": \"done\"}",
      "localValue": "{\"title\": \"Updated title\", \"status\": \"in_progress\"}"
    }
  ]
}
```

Resolution logic:
1. Filter operations by `(EntityType, EntityId, Version)`.
2. If server version > operation version → CONFLICT. Create `SyncConflict`, mark operation as `conflicted`.
3. If server version == operation version → APPLY. Increment server version.
4. If operation is `create` and entity already exists → CONFLICT (duplicate detection via client-generated ID or unique constraint).

**POST /api/sync/pull**

Request:
```json
{
  "since": "2026-05-01T09:00:00Z",
  "cursor": null,
  "limit": 100
}
```

Response:
```json
{
  "changes": [
    {
      "entityType": "Task",
      "entityId": "uuid",
      "operation": "update",
      "version": 5,
      "payload": "{\"title\": \"Server title\"}",
      "timestamp": "2026-05-01T09:30:00Z"
    }
  ],
  "nextCursor": "op_12345",
  "hasMore": true
}
```

Implementation note: Use a dedicated `entity_changelog` table (append-only, TTL-purged after 90 days) rather than scanning every table. This is critical for performance.

### 3.3 Controller Outline

```
SyncController
├── PushBatch()
│   ├── Validate batch structure
│   ├── Create SyncBatch record
│   ├── For each operation:
│   │   ├── Check server version vs operation version
│   │   ├── Apply or create conflict
│   │   └── Record in changelog
│   └── Return summary with conflicts
├── PullChanges()
│   ├── Query changelog since cursor/timestamp
│   ├── Filter by workspace membership
│   ├── Apply cursor pagination
│   └── Return changes + next cursor
├── GetConflicts()
│   └── Return unresolved conflicts for user
├── ResolveConflict()
│   ├── Validate resolution type
│   ├── Apply chosen value
│   └── Update conflict status
└── GetStatus()
    └── Return server info
```

### 3.4 Conflict Resolution Strategies

| Strategy | When to Use | Implementation |
|----------|-------------|----------------|
| Last-write-wins | Low-contention entities (notes, comments) | Accept the operation with the later `createdAt` |
| Server wins | System-managed fields (assignee, status) | Discard local change, return server value |
| Merge (field-level) | High-contention structured data (task title vs description changed independently) | Apply JSON merge patch — non-conflicting fields from both sides win |
| Manual | Business-critical (pricing, dates) | Surface via `SyncConflict` and let user decide |

The client should **never** auto-resolve conflicts for manual strategy — force user decision.

## 4. Frontend Design

### 4.1 Components

**OfflineIndicator** (persistent banner at top of app)
- States: `online` (hidden), `offline` (amber bar with icon), `reconnecting` (spinner + "Syncing...")
- Shows pending operation count in offline state
- On reconnect, transitions to a progress bar showing sync progress

**SyncProgressBar**
- Appears when reconnecting and batch operations > 0
- Shows `{applied}/{total}` with real-time updates from push response
- On conflict: collapses to warning and shows "X conflicts need review" link

**ConflictResolutionDialog**
- Two-column layout: "Your Changes" | "Server Changes"
- Per-field diff highlighting (green for additions, red for deletions, yellow for changes)
- Three action buttons:
  - "Keep Server" → `accept_server`
  - "Keep Mine" → `accept_local`
  - "Edit Merge" → opens an inline editor with merged base + accept/reject per field

**PendingChangesBadge**
- Red badge on navigation items showing count of offline edits for that section
- Badge clears when batch is pushed successfully

### 4.2 Data Flow

```
User action
  ↓
Optimistic update (immediate UI change)
  ↓
Write to IndexedDB operation log
  ↓
Attempt API call (normal path)
  ├── Success → clear from log
  └── Failure (network error)
       ↓
Queue in IndexedDB, show offline indicator
  ↓
navigator.onLine changes → true
  ↓
Push loop: drain queue via POST /api/sync/push
  ├── All applied → clear, hide indicator
  ├── Some conflicted → show ConflictResolutionDialog
  └── Some failed → retry with backoff (max 3)
```

### 4.3 Offline Storage (IndexedDB Schema)

```typescript
interface OfflineStore {
  operations: {
    key: autoIncrementId,
    value: {
      entityType: string,
      entityId: string,
      operation: 'create' | 'update' | 'delete',
      version: number,
      payload: object,
      createdAt: number,
      retryCount: number
    },
    indexes: ['createdAt', 'entityType']
  },
  pendingConflicts: {
    key: conflictId,
    value: ConflictData
  }
}
```

### 4.4 UX States

| State | Indicator | Behavior |
|-------|-----------|----------|
| Online, no pending | None | Normal operation |
| Online, pending ops | Small badge on sync icon | Flush queue immediately |
| Offline, first 5s | Subtle icon in status bar | Degrade gracefully; disable server-dependent features |
| Offline, >5s | Amber banner + pending count | Full offline mode; warn user data may be stale |
| Reconnecting | Spinner + progress | Block writes until sync completes (prevent cascading conflicts) |
| Conflicts found | Dialog overlay | Force resolution before allowing further edits to involved entities |
| Sync failed | Red banner + retry button | Exponential backoff; manual retry option |

### 4.5 Feature Degradation in Offline Mode

| Feature | Offline Behavior |
|---------|-----------------|
| Create task | Allowed, queued |
| Edit task | Allowed, queued |
| Delete task | Allowed, queued |
| Assign user | Allowed, queued (server validates still) |
| View project tree | Show cached version from last sync |
| Search | Show cached data only; disable full-text |
| Notifications | Queue for delivery |
| AI features | Disabled entirely ("AI unavailable offline") |
| Reports | Show cached data with stale-data warning |

---

## 5. Rollout Sequence

1. **Phase 1** — Backend sync endpoints + changelog table (no conflict resolution yet, last-write-wins only)
2. **Phase 2** — Conflict detection + resolution API + `SyncConflict` table
3. **Phase 3** — Frontend IndexedDB layer + operation queue
4. **Phase 4** — Offline indicator + conflict dialog UI
5. **Phase 5** — Feature degradation matrix + caching layer for read models

## 6. Open Questions

- Should we support merging arrays (e.g., adding tags on both sides)? CRDT approach needed.
- What is the cleanup policy for the changelog? 90 days is guesswork — need real data.
- How do we handle large file uploads made offline? Queue the metadata, warn about attachment size.
- Do we trust the client's `createdAt` for ordering? Risk of clock skew — use hybrid logical clocks (HLC)?

# FlowOS — Realtime Architecture

**Version**: 1.0  
**Status**: AUTHORITATIVE  
**Owner**: Realtime Lead  
**Stack**: Node.js 20 LTS + Socket.IO 4 + Y.js (CRDT) + Redis 7.2 pub/sub  
**Principle**: Every state change reaches every connected client in under 200ms. Clients that miss events while offline recover automatically and without data loss when they reconnect.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  React SPA            PWA (offline)         React Native         │
│  Socket.IO client     Socket.IO client      Socket.IO client     │
│  Y.js provider        Y.js provider         —                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ WSS (port 443, via Caddy)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│               Node.js Realtime Service                           │
│  Socket.IO Server                                                │
│  ├── Room Manager (workspace/board/item/document rooms)          │
│  ├── Auth middleware (JWT verification)                          │
│  ├── Y.js WebSocket provider (document CRDT sync)                │
│  ├── Redis Subscriber (consumes events from Laravel API)         │
│  ├── Presence Manager (who is online, who is typing)             │
│  └── Reconnection State Manager (missed event recovery)          │
└────────────────────────────┬────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
┌───────────▼────────────┐      ┌─────────────▼──────────┐
│  Redis pub/sub          │      │  PostgreSQL              │
│  Channel: flowos:events │      │  Table: realtime_events  │
│  (ephemeral broadcast)  │      │  (durable event log)     │
└────────────────────────┘      └────────────────────────┘
            ▲
            │ PUBLISH
┌───────────┴────────────┐
│  Laravel API            │
│  Model Observer         │
│  (emits on every write) │
└────────────────────────┘
```

---

## 2. Event Pipeline (Laravel → Client)

### Step 1: Laravel Model Observer publishes event

Every write to a primary entity emits to Redis AND inserts to `realtime_events` table (durable log):

```php
// app/Observers/ItemObserver.php
class ItemObserver
{
    public function updated(Item $item): void
    {
        $event = [
            'event_id'     => Str::ulid(),
            'workspace_id' => $item->workspace_id,
            'board_id'     => $item->board_id,
            'type'         => 'item:updated',
            'payload'      => ItemResource::make($item)->toArray(request()),
            'actor_id'     => auth()->id(),
            'occurred_at'  => now()->toISOString(),
            'sequence'     => $this->getNextSequence($item->board_id), // monotonic counter
        ];

        // Durable: write to DB first (survives Redis restart)
        RealtimeEvent::create($event);

        // Ephemeral: publish to Redis for immediate delivery
        Redis::publish(
            "flowos:board:{$item->board_id}",
            json_encode($event)
        );
    }
}
```

**Events emitted for all entity types**:

| Entity | Events |
|--------|--------|
| Item | `item:created`, `item:updated`, `item:deleted`, `item:moved` |
| Comment | `comment:created`, `comment:updated`, `comment:deleted` |
| Board | `board:updated`, `board:column_added`, `board:column_updated` |
| Group | `group:created`, `group:updated`, `group:deleted`, `group:reordered` |
| Member | `member:added`, `member:removed`, `member:role_changed` |
| Automation | `automation:triggered`, `automation:completed`, `automation:failed` |
| Notification | `notification:created` |
| Document | `document:updated` (Y.js handles the actual CRDT — this is metadata only) |

---

### Step 2: Node.js subscribes and broadcasts

```typescript
// src/events/EventBroadcaster.ts
class EventBroadcaster {
  private subscriber: Redis

  constructor(private io: Server) {
    this.subscriber = new Redis(config.redis)
    this.subscriber.psubscribe('flowos:*')
    this.subscriber.on('pmessage', this.handleMessage.bind(this))
  }

  private handleMessage(_pattern: string, channel: string, raw: string): void {
    const event: FlowOSEvent = JSON.parse(raw)

    // Route to correct Socket.IO room
    const room = this.channelToRoom(channel)
    this.io.to(room).emit(event.type, event)

    // Always also send to workspace-level room (for notification listeners)
    this.io.to(`workspace:${event.workspace_id}`).emit(event.type, event)
  }

  private channelToRoom(channel: string): string {
    // flowos:board:xxx → board:xxx
    // flowos:item:xxx  → item:xxx
    return channel.replace('flowos:', '')
  }
}
```

---

### Step 3: Client receives and applies optimistically

```typescript
// apps/web/src/stores/board.ts (Pinia)
// Optimistic update pattern — no waiting for server round-trip

async function updateItemTitle(itemId: string, title: string): Promise<void> {
  // 1. Apply optimistically to local state immediately
  const item = findItem(itemId)
  const previousTitle = item.title
  item.title = title  // User sees change instantly

  try {
    // 2. Send to server
    await api.patch(`/items/${itemId}`, { title })
    // Server emits item:updated → all other clients receive and apply
  } catch (error) {
    // 3. Rollback on failure
    item.title = previousTitle
    toast.error('Failed to update item')
  }
}

// Socket.IO listener — applied to all clients EXCEPT the one that made the change
// (deduplicated by actor_id check)
socket.on('item:updated', (event: ItemUpdatedEvent) => {
  if (event.actor_id === currentUserId) return  // Already applied optimistically
  applyItemUpdate(event.payload)
})
```

---

## 3. Room Architecture

### Room Hierarchy

```
workspace:{id}          ← All members of workspace (notifications, member events)
  board:{id}            ← All viewers of specific board (item events, group events)
    item:{id}           ← Users with item detail open (comment events, activity)
  document:{id}         ← Collaborative document editors (Y.js sync + metadata)
  crm:pipeline:{id}     ← CRM pipeline viewers (deal events)
```

### Room Join/Leave

```typescript
// src/rooms/RoomManager.ts
socket.on('room:join', async (rooms: string[]) => {
  for (const room of rooms) {
    // Verify permission before joining
    const permitted = await verifyRoomPermission(socket.data.userId, room)
    if (!permitted) {
      socket.emit('room:error', { room, code: 'FORBIDDEN' })
      continue
    }
    await socket.join(room)
    socket.emit('room:joined', { room })
    
    // Send current sequence number so client can request missed events
    const seq = await getLatestSequence(room)
    socket.emit('room:sequence', { room, sequence: seq })
  }
})

socket.on('room:leave', (rooms: string[]) => {
  rooms.forEach(room => socket.leave(room))
})
```

---

## 4. Missed Event Recovery (Reconnection)

Clients that reconnect after a disconnect must catch up on all missed events:

```typescript
// apps/web/src/realtime/RealtimeClient.ts
socket.on('connect', async () => {
  // For each room the client was in:
  for (const [room, lastSeq] of this.roomSequences) {
    socket.emit('room:catchup', { room, from_sequence: lastSeq })
  }
})

// Server handles catchup request:
// src/handlers/CatchupHandler.ts
socket.on('room:catchup', async ({ room, from_sequence }: CatchupRequest) => {
  // Query durable event log in PostgreSQL
  const missedEvents = await db.query(
    `SELECT * FROM realtime_events
     WHERE room = $1
       AND sequence > $2
       AND occurred_at > NOW() - INTERVAL '7 days'
     ORDER BY sequence ASC
     LIMIT 500`,
    [room, from_sequence]
  )

  if (missedEvents.rows.length > 0) {
    socket.emit('room:catchup:events', {
      room,
      events: missedEvents.rows,
      complete: missedEvents.rows.length < 500,
    })
  }
  
  // If > 500 events missed (very long offline): full board reload
  if (missedEvents.rows.length >= 500) {
    socket.emit('room:reload_required', { room })
    // Client fetches full board state from REST API
  }
})
```

---

## 5. Presence System

Real-time presence: who is online, which board they're on, who is typing.

```typescript
// src/presence/PresenceManager.ts
// Stored in Redis (TTL-based, auto-cleans on disconnect)

class PresenceManager {
  async userJoinedBoard(userId: string, boardId: string, workspaceId: string): Promise<void> {
    const key = `presence:board:${boardId}`
    await redis.hset(key, userId, JSON.stringify({
      userId,
      name: await getUserName(userId),
      avatar: await getUserAvatar(userId),
      joinedAt: Date.now(),
    }))
    await redis.expire(key, 300)  // 5-min TTL, refreshed on heartbeat

    // Broadcast to board room
    const presence = await this.getBoardPresence(boardId)
    io.to(`board:${boardId}`).emit('presence:updated', { boardId, users: presence })
  }

  async userTyping(userId: string, itemId: string, field: string): Promise<void> {
    // Ephemeral — no Redis storage, just broadcast
    io.to(`item:${itemId}`).emit('presence:typing', { userId, itemId, field })
    
    // Auto-clear typing after 3s (client-side debounce)
    setTimeout(() => {
      io.to(`item:${itemId}`).emit('presence:typing:cleared', { userId, itemId, field })
    }, 3000)
  }
}
```

---

## 6. Collaborative Document Editing (Y.js CRDT)

Documents use Y.js Conflict-Free Replicated Data Types — multiple users can edit simultaneously and their changes merge without conflict.

### Architecture

```
Client A (BlockNote + Y.js)
    │
    │ Y.js binary update messages (WebSocket)
    ▼
Node.js Realtime Service
    ├── y-websocket provider: routes updates between clients
    └── Persistence: saves Y.js document state to PostgreSQL every 5s
            └── documents.ydoc_state BYTEA
```

### Server-Side Y.js Setup

```typescript
// src/ydoc/YDocManager.ts
import * as Y from 'yjs'
import { setupWSConnection } from 'y-websocket/bin/utils'

// Each document gets its own Y.Doc instance (in memory while active)
const docs = new Map<string, Y.Doc>()

io.on('connection', (socket) => {
  socket.on('ydoc:connect', async ({ documentId }) => {
    // Permission check
    const permitted = await canEditDocument(socket.data.userId, documentId)
    if (!permitted) { socket.emit('ydoc:forbidden'); return }

    // Load or create Y.Doc
    if (!docs.has(documentId)) {
      const doc = new Y.Doc()
      // Load persisted state from PostgreSQL
      const stored = await db.query(
        'SELECT ydoc_state FROM documents WHERE id = $1', [documentId]
      )
      if (stored.rows[0]?.ydoc_state) {
        Y.applyUpdate(doc, stored.rows[0].ydoc_state)
      }
      docs.set(documentId, doc)
    }

    setupWSConnection(socket.conn, socket.request, { docName: documentId })
  })
})

// Persist Y.Doc state every 5 seconds if modified
setInterval(async () => {
  for (const [docId, doc] of docs) {
    if (doc._modified) {
      const state = Y.encodeStateAsUpdate(doc)
      await db.query(
        'UPDATE documents SET ydoc_state = $1, updated_at = NOW() WHERE id = $2',
        [state, docId]
      )
      doc._modified = false
    }
  }
}, 5000)
```

### Conflict Resolution

Y.js CRDT guarantees:
- **No conflicts**: concurrent edits always merge to identical state on all clients
- **No last-write-wins**: all edits preserved, interleaved correctly
- **Offline edits**: when client reconnects, local Y.js updates sync automatically
- **Network partition**: both sides accumulate updates, merge on reconnect

---

## 7. Connection Lifecycle & Reconnection Strategy

### Client-Side (React)

```typescript
// apps/web/src/realtime/RealtimeClient.ts
const socket = io('wss://rt.flowos.app', {
  auth: { token: getAccessToken() },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,    // Max 30s between attempts
  randomizationFactor: 0.5,       // Jitter to avoid thundering herd
  timeout: 20000,
})

socket.on('connect', () => {
  setOnlineStatus(true)
  catchupMissedEvents()   // Request missed events for all joined rooms
})

socket.on('disconnect', (reason) => {
  setOnlineStatus(false)
  if (reason === 'io server disconnect') {
    // Server forcibly disconnected (auth expired, kicked)
    refreshTokenAndReconnect()
  }
  // Otherwise: automatic reconnection with backoff
})

socket.on('connect_error', (error) => {
  if (error.message === 'TOKEN_EXPIRED') {
    refreshTokenAndReconnect()
  }
})
```

### Server-Side Auth Middleware

```typescript
// src/middleware/auth.ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) return next(new Error('NO_TOKEN'))

  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    socket.data.userId = decoded.sub
    socket.data.workspaceId = decoded.workspace_id
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('TOKEN_EXPIRED'))
    }
    return next(new Error('INVALID_TOKEN'))
  }
})
```

---

## 8. Scaling Strategy

### Phase 4 (Closed Beta): Single Node.js instance
- Handles ~5,000 concurrent WebSocket connections
- Single Redis instance (pub/sub + presence)

### Phase 5+ (Post-Launch): Horizontal scaling
```
Multiple Node.js Realtime instances
    ├── Socket.IO Adapter: @socket.io/redis-adapter
    │   (events published to Redis are received by ALL instances)
    ├── Sticky sessions via Caddy (required for Socket.IO polling fallback)
    └── Shared presence state in Redis (not in-memory per instance)
```

```typescript
// src/app.ts (scaling setup)
import { createAdapter } from '@socket.io/redis-adapter'
const pubClient = new Redis(config.redis)
const subClient = pubClient.duplicate()
io.adapter(createAdapter(pubClient, subClient))
// Now: events emitted on instance A are received by clients connected to instance B
```

---

## 9. PWA Offline Mode

When client is offline (no network):
1. Socket.IO disconnects → `connect` retry loop starts with backoff
2. **Pinia stores serve cached state** from IndexedDB (populated on last online session)
3. User can still: read boards, read items, create items (queued), add comments (queued)
4. All offline mutations stored in **IndexedDB mutation queue**
5. On reconnect: mutation queue drains in order → optimistic updates resolve or conflict
6. **Conflict strategy**: server wins for concurrent edits to the same field; both writes preserved in activity log

```typescript
// apps/web/src/offline/MutationQueue.ts
// On reconnect:
async function drainQueue(): Promise<void> {
  const mutations = await db.getAll('mutation_queue')  // IndexedDB
  for (const mutation of mutations) {
    try {
      await api[mutation.method](mutation.url, mutation.payload)
      await db.delete('mutation_queue', mutation.id)
    } catch (error) {
      if (error.status === 409) {
        // Conflict: show resolution UI
        conflicts.push({ mutation, serverState: error.serverState })
      }
    }
  }
}
```

---

*Owner: Realtime Lead*  
*Cross-reference: ARCHITECTURE.md §3.2, DATABASE_SCHEMA.md (realtime_events table), QA_STRATEGY.md §3 (realtime integration tests)*

// src/handlers/documentHandlers.ts — Y.js CRDT collaboration
import type { Socket, Server } from 'socket.io'
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import { logger } from '../index'

// In-memory doc store (per process); Redis pub/sub syncs across instances
const docs = new Map<string, Y.Doc>()
const awareness = new Map<string, awarenessProtocol.Awareness>()

// Persist Y.js doc state to API every 5s
const PERSIST_INTERVAL = 5000
const persistTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function registerDocumentHandlers(
  socket: Socket,
  io: Server,
  workspaceId: string
): void {
  socket.on('doc:subscribe', async ({ docId }: { docId: string }) => {
    const room = `doc:${docId}`
    socket.join(room)

    let doc = docs.get(docId)
    if (!doc) {
      doc = new Y.Doc()
      docs.set(docId, doc)
      awareness.set(docId, new awarenessProtocol.Awareness(doc))

      // Load persisted state from API
      try {
        const state = await loadDocState(docId, workspaceId)
        if (state) Y.applyUpdate(doc, state)
      } catch (e) {
        logger.warn({ docId, err: e }, 'Could not load doc state')
      }
    }

    // Send current doc state to new subscriber
    const syncMsg = Buffer.from(
      syncProtocol.encodeSyncStep1(Y.encodeStateVector(doc))
    )
    socket.emit('doc:sync', { docId, message: syncMsg })

    logger.debug({ docId, userId: socket.data.userId }, 'doc:subscribe')
  })

  socket.on('doc:update', ({ docId, update }: { docId: string; update: ArrayBuffer }) => {
    const doc = docs.get(docId)
    if (!doc) return

    const u = new Uint8Array(update)
    Y.applyUpdate(doc, u)

    // Broadcast to others in same doc room
    socket.to(`doc:${docId}`).emit('doc:update', { docId, update })

    // Schedule persist
    schedulePersist(docId, workspaceId, doc)
  })

  socket.on('doc:awareness', ({ docId, update }: { docId: string; update: ArrayBuffer }) => {
    socket.to(`doc:${docId}`).emit('doc:awareness', { docId, update })
  })

  socket.on('doc:unsubscribe', ({ docId }: { docId: string }) => {
    socket.leave(`doc:${docId}`)
  })
}

function schedulePersist(docId: string, workspaceId: string, doc: Y.Doc) {
  if (persistTimers.has(docId)) return

  const timer = setTimeout(async () => {
    persistTimers.delete(docId)
    const state = Y.encodeStateAsUpdate(doc)
    await persistDocState(docId, workspaceId, state)
  }, PERSIST_INTERVAL)

  persistTimers.set(docId, timer)
}

async function loadDocState(docId: string, workspaceId: string): Promise<Uint8Array | null> {
  try {
    const { default: axios } = await import('axios')
    const res = await axios.get(`http://api:8000/api/documents/${docId}/ydoc`, {
      headers: {
        'X-Workspace-ID':  workspaceId,
        'X-Internal-Key':  process.env.INTERNAL_API_KEY ?? '',
      },
      responseType: 'arraybuffer',
    })
    return new Uint8Array(res.data)
  } catch {
    return null
  }
}

async function persistDocState(docId: string, workspaceId: string, state: Uint8Array) {
  try {
    const { default: axios } = await import('axios')
    await axios.patch(`http://api:8000/api/documents/${docId}/ydoc`, state, {
      headers: {
        'Content-Type':    'application/octet-stream',
        'X-Workspace-ID':  workspaceId,
        'X-Internal-Key':  process.env.INTERNAL_API_KEY ?? '',
      },
    })
  } catch (e) {
    logger.error({ docId, err: e }, 'Failed to persist doc state')
  }
}

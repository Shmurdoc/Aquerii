// src/ydoc/YDocManager.ts — server-side Y.js CRDT document management
import * as Y from 'yjs'
import type { Server, Socket } from 'socket.io'
import type { Redis } from 'ioredis'
import axios from 'axios'

interface DocState {
  doc: Y.Doc
  lastModified: number
  persistTimer?: NodeJS.Timeout
}

export class YDocManager {
  private docs = new Map<string, DocState>()

  /** Debounce delay before persisting to the API DB after last update (ms). */
  private readonly PERSIST_DELAY = 5000

  constructor(
    private io: Server,
    private redis: Redis,
    private apiUrl: string,
    private apiSecret: string,
  ) {}

  private docKey(docId: string): string {
    return `ydoc:state:${docId}`
  }

  /**
   * Returns an existing in-memory Y.Doc or creates one, loading state from
   * Redis cache first, falling back to the API DB.
   */
  async getOrCreate(docId: string): Promise<Y.Doc> {
    if (this.docs.has(docId)) return this.docs.get(docId)!.doc

    const doc = new Y.Doc()

    // 1. Try Redis cache (fast path)
    const cached = await this.redis.getBuffer(this.docKey(docId))
    if (cached && cached.length > 0) {
      Y.applyUpdate(doc, cached)
    } else {
      // 2. Fall back to persistent storage via internal API
      try {
        const res = await axios.get(`${this.apiUrl}/internal/documents/${docId}/ydoc`, {
          headers: { 'X-Internal-Secret': this.apiSecret },
          responseType: 'arraybuffer',
          timeout: 5000,
        })
        if (res.data && (res.data as ArrayBuffer).byteLength > 0) {
          Y.applyUpdate(doc, Buffer.from(res.data as ArrayBuffer))
        }
      } catch {
        // New document — start fresh
      }
    }

    this.docs.set(docId, { doc, lastModified: Date.now() })
    return doc
  }

  /**
   * Applies a client update to the in-memory doc, caches it in Redis, broadcasts
   * the update to other clients in the room, and schedules a persist to the API DB.
   */
  async applyUpdate(docId: string, update: Uint8Array, socket: Socket, room: string): Promise<void> {
    const doc = await this.getOrCreate(docId)
    Y.applyUpdate(doc, update)

    const state = this.docs.get(docId)!
    state.lastModified = Date.now()

    // Cache encoded full state in Redis immediately
    const encoded = Y.encodeStateAsUpdate(doc)
    await this.redis.set(this.docKey(docId), Buffer.from(encoded), 'EX', 86400)

    // Broadcast delta update to other clients in the room
    socket.to(room).emit('doc:update', {
      docId,
      update: Buffer.from(update).toString('base64'),
    })

    // Debounce persist to API DB
    this.schedulePersist(docId)
  }

  private schedulePersist(docId: string): void {
    const state = this.docs.get(docId)
    if (!state) return

    if (state.persistTimer) clearTimeout(state.persistTimer)
    state.persistTimer = setTimeout(() => this.persistToAPI(docId), this.PERSIST_DELAY)
  }

  private async persistToAPI(docId: string): Promise<void> {
    const state = this.docs.get(docId)
    if (!state) return

    const encoded = Y.encodeStateAsUpdate(state.doc)
    try {
      await axios.patch(
        `${this.apiUrl}/internal/documents/${docId}/ydoc`,
        { ydoc_state: Buffer.from(encoded).toString('base64') },
        {
          headers: {
            'X-Internal-Secret': this.apiSecret,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      )
    } catch (err) {
      console.error(`[YDocManager] Failed to persist doc ${docId}:`, err)
    }
  }

  /**
   * Encodes and returns the current state vector for the given document.
   * Used during client sync handshake (step 1).
   */
  async getStateVector(docId: string): Promise<Uint8Array> {
    const doc = await this.getOrCreate(docId)
    return Y.encodeStateVector(doc)
  }

  /**
   * Returns an update containing all changes the client is missing,
   * computed from the client-supplied state vector.
   */
  async getUpdate(docId: string, stateVector: Uint8Array): Promise<Uint8Array> {
    const doc = await this.getOrCreate(docId)
    return Y.encodeStateAsUpdate(doc, stateVector)
  }

  /**
   * Forces an immediate persist of a doc to the API DB (e.g. on graceful shutdown).
   */
  async flush(docId: string): Promise<void> {
    const state = this.docs.get(docId)
    if (!state) return
    if (state.persistTimer) {
      clearTimeout(state.persistTimer)
      state.persistTimer = undefined
    }
    await this.persistToAPI(docId)
  }

  /**
   * Flushes all in-memory documents. Call during graceful shutdown.
   */
  async flushAll(): Promise<void> {
    await Promise.allSettled([...this.docs.keys()].map((id) => this.flush(id)))
  }
}

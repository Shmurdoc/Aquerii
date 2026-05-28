/**
 * Offline mutation queue using IndexedDB.
 * Queues API mutations when offline and replays them when reconnected.
 * Includes version tracking for conflict detection.
 */
import { openDB, IDBPDatabase } from 'idb'

export interface QueuedMutation {
  id: string
  method: 'post' | 'put' | 'patch' | 'delete'
  url: string
  data?: unknown
  idempotencyKey: string
  entityType?: string
  entityId?: string
  entityVersion?: number
  createdAt: number
  retries: number
}

export interface SyncConflict {
  id: string
  entityType: string
  entityId: string
  operation: string
  localData: unknown
  serverData: unknown
  resolution?: 'local' | 'server' | 'merged' | 'dismissed'
  mergedData?: unknown
  createdAt: number
}

const DB_NAME = 'aquerii-offline'
const STORE   = 'mutations'
const CONFLICT_STORE = 'conflicts'

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
        db.createObjectStore(CONFLICT_STORE, { keyPath: 'id' })
      }
    },
  })
}

export async function enqueue(mutation: Omit<QueuedMutation, 'createdAt' | 'retries'>): Promise<void> {
  const db = await getDB()
  await db.put(STORE, { ...mutation, createdAt: Date.now(), retries: 0 })
}

export async function getAll(): Promise<QueuedMutation[]> {
  const db = await getDB()
  return db.getAll(STORE)
}

export async function remove(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await getDB()
  const mutation = await db.get(STORE, id)
  if (mutation) {
    await db.put(STORE, { ...mutation, retries: mutation.retries + 1 })
  }
}

export async function addConflict(conflict: SyncConflict): Promise<void> {
  const db = await getDB()
  await db.put(CONFLICT_STORE, conflict)
}

export async function getConflicts(): Promise<SyncConflict[]> {
  const db = await getDB()
  return db.getAll(CONFLICT_STORE)
}

export async function resolveConflict(id: string, resolution: SyncConflict['resolution'], mergedData?: unknown): Promise<void> {
  const db = await getDB()
  const conflict = await db.get(CONFLICT_STORE, id)
  if (conflict) {
    await db.put(CONFLICT_STORE, { ...conflict, resolution, mergedData })
  }
}

export async function removeConflict(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(CONFLICT_STORE, id)
}

export async function replay(
  apiFn: (
    method: string,
    url: string,
    data?: unknown,
    idempotencyKey?: string,
    expectedVersion?: number,
  ) => Promise<{ success: boolean; conflict?: { localData: unknown; serverData: unknown } }>,
): Promise<{ applied: number; conflicted: number }> {
  const mutations = await getAll()
  let applied = 0
  let conflicted = 0

  for (const mutation of mutations.sort((a, b) => a.createdAt - b.createdAt)) {
    try {
      const result = await apiFn(
        mutation.method,
        mutation.url,
        mutation.data,
        mutation.idempotencyKey,
        mutation.entityVersion,
      )

      if (result.conflict) {
        // Store conflict for user resolution
        await addConflict({
          id: mutation.id,
          entityType: mutation.entityType ?? 'unknown',
          entityId: mutation.entityId ?? '',
          operation: mutation.method,
          localData: mutation.data,
          serverData: result.conflict.serverData,
          createdAt: Date.now(),
        })
        conflicted++
      } else {
        await remove(mutation.id)
        applied++
      }
    } catch {
      await incrementRetry(mutation.id)
    }
  }

  return { applied, conflicted }
}

export async function getPendingCount(): Promise<number> {
  const mutations = await getAll()
  return mutations.length
}

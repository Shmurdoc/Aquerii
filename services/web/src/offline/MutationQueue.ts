/**
 * Offline mutation queue using IndexedDB.
 * Queues API mutations when offline and replays them when reconnected.
 */
import { openDB, IDBPDatabase } from 'idb'

export interface QueuedMutation {
  id: string
  method: 'post' | 'put' | 'patch' | 'delete'
  url: string
  data?: unknown
  idempotencyKey: string
  createdAt: number
  retries: number
}

const DB_NAME = 'aquerii-offline'
const STORE   = 'mutations'

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
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

export async function replay(
  apiFn: (method: string, url: string, data?: unknown, idempotencyKey?: string) => Promise<unknown>
): Promise<void> {
  const mutations = await getAll()
  for (const mutation of mutations.sort((a, b) => a.createdAt - b.createdAt)) {
    try {
      await apiFn(mutation.method, mutation.url, mutation.data, mutation.idempotencyKey)
      await remove(mutation.id)
    } catch {
      await incrementRetry(mutation.id)
    }
  }
}

// Offline Manager for Aquerii
// Handles offline detection, IndexedDB storage, and background sync

export interface PendingMutation {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

export class OfflineManager {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initDB();
    this.setupEventListeners();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('aquerii-offline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Mutations store for offline queue
        if (!db.objectStoreNames.contains('mutations')) {
          db.createObjectStore('mutations', { keyPath: 'id' });
        }

        // Cache store for offline data
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingMutations();
      window.dispatchEvent(new CustomEvent('offline-status', { detail: { online: true } }));
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      window.dispatchEvent(new CustomEvent('offline-status', { detail: { online: false } }));
    });
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async addPendingMutation(mutation: Omit<PendingMutation, 'id' | 'timestamp'>): Promise<void> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction('mutations', 'readwrite');
    const store = tx.objectStore('mutations');
    
    const record: PendingMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    await store.add(record);
  }

  public async getPendingMutations(): Promise<PendingMutation[]> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction('mutations', 'readonly');
    const store = tx.objectStore('mutations');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async removePendingMutation(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction('mutations', 'readwrite');
    const store = tx.objectStore('mutations');
    await store.delete(id);
  }

  public async syncPendingMutations(): Promise<void> {
    const mutations = await this.getPendingMutations();
    
    for (const mutation of mutations) {
      try {
        await fetch(mutation.url, {
          method: mutation.method,
          headers: mutation.headers,
          body: mutation.body
        });
        await this.removePendingMutation(mutation.id);
      } catch (error) {
        console.error('Sync failed for mutation:', mutation.id, error);
      }
    }
  }

  public async cacheData(key: string, data: unknown): Promise<void> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    
    await store.put({ key, data, timestamp: Date.now() });
  }

  public async getCachedData(key: string): Promise<unknown | null> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  public async clearCache(): Promise<void> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    await store.clear();
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();

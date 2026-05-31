"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YDocManager = void 0;
// src/ydoc/YDocManager.ts — server-side Y.js CRDT document management
const Y = __importStar(require("yjs"));
const axios_1 = __importDefault(require("axios"));
class YDocManager {
    constructor(io, redis, apiUrl, apiSecret) {
        this.io = io;
        this.redis = redis;
        this.apiUrl = apiUrl;
        this.apiSecret = apiSecret;
        this.docs = new Map();
        /** Debounce delay before persisting to the API DB after last update (ms). */
        this.PERSIST_DELAY = 5000;
    }
    docKey(docId) {
        return `ydoc:state:${docId}`;
    }
    /**
     * Returns an existing in-memory Y.Doc or creates one, loading state from
     * Redis cache first, falling back to the API DB.
     */
    async getOrCreate(docId) {
        if (this.docs.has(docId))
            return this.docs.get(docId).doc;
        const doc = new Y.Doc();
        // 1. Try Redis cache (fast path)
        const cached = await this.redis.getBuffer(this.docKey(docId));
        if (cached && cached.length > 0) {
            Y.applyUpdate(doc, cached);
        }
        else {
            // 2. Fall back to persistent storage via internal API
            try {
                const res = await axios_1.default.get(`${this.apiUrl}/internal/documents/${docId}/ydoc`, {
                    headers: { 'X-Internal-Secret': this.apiSecret },
                    responseType: 'arraybuffer',
                    timeout: 5000,
                });
                if (res.data && res.data.byteLength > 0) {
                    Y.applyUpdate(doc, Buffer.from(res.data));
                }
            }
            catch {
                // New document — start fresh
            }
        }
        this.docs.set(docId, { doc, lastModified: Date.now() });
        return doc;
    }
    /**
     * Applies a client update to the in-memory doc, caches it in Redis, broadcasts
     * the update to other clients in the room, and schedules a persist to the API DB.
     */
    async applyUpdate(docId, update, socket, room) {
        const doc = await this.getOrCreate(docId);
        Y.applyUpdate(doc, update);
        const state = this.docs.get(docId);
        state.lastModified = Date.now();
        // Cache encoded full state in Redis immediately
        const encoded = Y.encodeStateAsUpdate(doc);
        await this.redis.set(this.docKey(docId), Buffer.from(encoded), 'EX', 86400);
        // Broadcast delta update to other clients in the room
        socket.to(room).emit('doc:update', {
            docId,
            update: Buffer.from(update).toString('base64'),
        });
        // Debounce persist to API DB
        this.schedulePersist(docId);
    }
    schedulePersist(docId) {
        const state = this.docs.get(docId);
        if (!state)
            return;
        if (state.persistTimer)
            globalThis.clearTimeout(state.persistTimer);
        state.persistTimer = globalThis.setTimeout(() => this.persistToAPI(docId), this.PERSIST_DELAY);
    }
    async persistToAPI(docId) {
        const state = this.docs.get(docId);
        if (!state)
            return;
        const encoded = Y.encodeStateAsUpdate(state.doc);
        try {
            await axios_1.default.put(`${this.apiUrl}/internal/documents/${docId}/ydoc`, { ydoc_state: Buffer.from(encoded).toString('base64') }, {
                headers: {
                    'X-Internal-Secret': this.apiSecret,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
        }
        catch (err) {
            console.error(`[YDocManager] Failed to persist doc ${docId}:`, err);
        }
    }
    /**
     * Encodes and returns the current state vector for the given document.
     * Used during client sync handshake (step 1).
     */
    async getStateVector(docId) {
        const doc = await this.getOrCreate(docId);
        return Y.encodeStateVector(doc);
    }
    /**
     * Returns an update containing all changes the client is missing,
     * computed from the client-supplied state vector.
     */
    async getUpdate(docId, stateVector) {
        const doc = await this.getOrCreate(docId);
        return Y.encodeStateAsUpdate(doc, stateVector);
    }
    /**
     * Forces an immediate persist of a doc to the API DB (e.g. on graceful shutdown).
     */
    async flush(docId) {
        const state = this.docs.get(docId);
        if (!state)
            return;
        if (state.persistTimer) {
            globalThis.clearTimeout(state.persistTimer);
            state.persistTimer = undefined;
        }
        await this.persistToAPI(docId);
    }
    /**
     * Flushes all in-memory documents. Call during graceful shutdown.
     */
    async flushAll() {
        await Promise.allSettled([...this.docs.keys()].map((id) => this.flush(id)));
    }
}
exports.YDocManager = YDocManager;
//# sourceMappingURL=YDocManager.js.map
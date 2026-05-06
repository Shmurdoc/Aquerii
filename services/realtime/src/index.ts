// src/index.ts — Aquerii Realtime Server entry point
import './instrumentation' // OTel must initialise before anything else

import { createServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import pino from 'pino'

import { verifySanctumToken } from './auth/sanctum'
import { RoomManager } from './rooms/RoomManager'
import { PresenceManager } from './presence/PresenceManager'
import { YDocManager } from './ydoc/YDocManager'
import { EventBroadcaster } from './events/EventBroadcaster'
import { registerCatchupHandler } from './handlers/catchupHandler'
import { connectedClients, messagesTotal, createMetricsServer } from './metrics'

// ── Logger (exported so legacy modules can import it) ─────────────────────────
export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

// ── Config ────────────────────────────────────────────────────────────────────
const PORT       = parseInt(process.env.PORT ?? '3000', 10)
const REDIS_URL  = process.env.REDIS_URL
  ?? `redis://:${process.env.REDIS_PASSWORD ?? ''}@${process.env.REDIS_HOST ?? 'redis'}:${process.env.REDIS_PORT ?? '6379'}`
const API_URL    = process.env.API_URL ?? 'http://api:8000'
const API_SECRET = process.env.REALTIME_SECRET ?? process.env.INTERNAL_API_KEY ?? ''
const ORIGINS    = (process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',')

async function bootstrap(): Promise<void> {
  // ── Redis connections ────────────────────────────────────────────────────
  // socket.io-redis-adapter requires separate pub/sub clients.
  // A third client is used for all other Redis operations.
  const pubClient    = new Redis(REDIS_URL).on('error', (e) => logger.error(e, 'Redis pub error'))
  const subClient    = pubClient.duplicate()
  const redisClient  = pubClient.duplicate()

  // ── HTTP + Socket.IO ─────────────────────────────────────────────────────
  const httpServer = createServer((_req, res) => {
    res.writeHead(404)
    res.end()
  })

  const io = new Server(httpServer, {
    cors: {
      origin:      ORIGINS,
      credentials: true,
      methods:     ['GET', 'POST'],
    },
    transports:          ['websocket', 'polling'],
    pingTimeout:         20_000,
    pingInterval:        25_000,
    maxHttpBufferSize:   1e6, // 1 MB
  })

  io.adapter(createAdapter(pubClient, subClient))

  // ── Auth middleware ───────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization ?? '').replace('Bearer ', '')

    if (!token) return next(new Error('AUTH_REQUIRED'))

    try {
      const payload = await verifySanctumToken(token, API_URL, redisClient)
      // Attach structured payload for new managers
      socket.data.user = { ...payload, iat: 0, exp: 0 }
      // Also set flat fields for legacy handlers
      socket.data.userId      = payload.sub
      socket.data.workspaceId = payload.workspace_id
      socket.data.name        = payload.name ?? ''
      next()
    } catch (err) {
      logger.warn({ err }, 'Socket auth failed')
      next(new Error('AUTH_INVALID'))
    }
  })

  // ── Manager instances ─────────────────────────────────────────────────────
  const roomManager     = new RoomManager(io, redisClient)
  const presenceManager = new PresenceManager(io, redisClient)
  const ydocManager     = new YDocManager(io, redisClient, API_URL, API_SECRET)
  const broadcaster     = new EventBroadcaster(io, redisClient, API_URL, API_SECRET)

  // Subscribe to the Redis channel for Laravel-published realtime events
  await broadcaster.start()

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const user = socket.data.user

    connectedClients.inc()
    logger.info({ userId: user.sub, workspaceId: user.workspace_id }, 'Client connected')

    // Auto-join the workspace room so workspace-wide broadcasts reach this socket
    socket.join(`workspace:${user.workspace_id}`)

    // Register room join/leave, presence typing, and disconnect handlers
    registerCatchupHandler(socket, user, roomManager, presenceManager, broadcaster)

    // ── Y.js document sync ──────────────────────────────────────────────────
    socket.on('doc:update', async (data: { docId: string; update: string; room: string }) => {
      try {
        const update = Buffer.from(data.update, 'base64')
        await ydocManager.applyUpdate(data.docId, update, socket, data.room)
        messagesTotal.inc({ event: 'doc:update' })
      } catch (err) {
        logger.error({ err, docId: data.docId }, 'doc:update error')
      }
    })

    socket.on('doc:sync', async (data: { docId: string; stateVector: string }) => {
      try {
        const stateVector = Buffer.from(data.stateVector, 'base64')
        const update = await ydocManager.getUpdate(data.docId, stateVector)
        socket.emit('doc:sync:reply', {
          docId:  data.docId,
          update: Buffer.from(update).toString('base64'),
        })
        messagesTotal.inc({ event: 'doc:sync' })
      } catch (err) {
        logger.error({ err, docId: data.docId }, 'doc:sync error')
      }
    })

    // Relay Y.js awareness updates (cursor positions etc.) without server processing
    socket.on('doc:awareness', (data: { docId: string; update: string }) => {
      socket.to(`doc:${data.docId}`).emit('doc:awareness', data)
      messagesTotal.inc({ event: 'doc:awareness' })
    })

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      connectedClients.dec()
      logger.info({ userId: user.sub, reason }, 'Client disconnected')
    })
  })

  // ── Start listening ───────────────────────────────────────────────────────
  httpServer.listen(PORT, () => {
    logger.info(`[Aquerii Realtime] listening on :${PORT}`)
  })

  // Metrics server on a separate port scraped by Prometheus
  createMetricsServer(9464)

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down realtime server')
    // Flush all Y.js docs to the API before exiting
    await ydocManager.flushAll()
    await broadcaster.stop()
    io.close(() => {
      pubClient.quit()
      subClient.quit()
      redisClient.quit()
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  logger.fatal(err, 'Failed to start realtime server')
  process.exit(1)
})

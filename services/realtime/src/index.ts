// src/index.ts — Aquerii Realtime Server entry point
import './instrumentation'; // OTel must be first
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'ioredis';
import pino from 'pino';
import { createMetricsServer } from './metrics';
import { authMiddleware } from './middleware/auth';
import { registerHandlers } from './handlers';
import { RoomManager } from './rooms/RoomManager';
import { EventBroadcaster } from './broadcaster/EventBroadcaster';

export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const PORT        = parseInt(process.env.PORT ?? '3000', 10);
const REDIS_URL   = process.env.REDIS_URL ?? 'redis://redis:6379';
const ORIGINS     = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',');

async function bootstrap() {
  // Redis clients — separate pub/sub connections required by socket.io adapter
  const pubClient = createClient({ lazyConnect: true }).on('error', e => logger.error(e));
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);

  const httpServer = createServer((req, res) => {
    // Health endpoint for Docker healthcheck
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const io = new Server(httpServer, {
    cors: {
      origin: ORIGINS,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  io.adapter(createAdapter(pubClient, subClient));

  // Auth middleware (verifies Sanctum / JWT token)
  io.use(authMiddleware);

  const roomManager    = new RoomManager(io, pubClient);
  const broadcaster    = new EventBroadcaster(io, pubClient);

  // Register all event handlers
  registerHandlers(io, roomManager, broadcaster);

  // Subscribe to Redis channel for API-published events
  subClient.subscribe('aquerii:realtime', (message) => {
    try {
      const event = JSON.parse(message);
      broadcaster.broadcast(event);
    } catch (e) {
      logger.error({ err: e }, 'Failed to parse realtime event from Redis');
    }
  });

  httpServer.listen(PORT, () => {
    logger.info(`Realtime server listening on :${PORT}`);
  });

  // Metrics server on separate port (scraped by Prometheus)
  await createMetricsServer(9464);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down realtime server');
    io.close(() => {
      pubClient.quit();
      subClient.quit();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch(err => {
  logger.fatal(err, 'Failed to start realtime server');
  process.exit(1);
});

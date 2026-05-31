import http from 'http'
import type { ServerResponse } from 'http'
import { register, collectDefaultMetrics, Counter, Gauge } from 'prom-client'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

collectDefaultMetrics({ prefix: 'aquerii_realtime_' })

export const connectedClients = new Gauge({
  name: 'aquerii_realtime_connected_clients',
  help: 'Number of currently connected Socket.IO clients',
})

export const roomCount = new Gauge({
  name: 'aquerii_realtime_room_count',
  help: 'Number of active rooms',
})

export const messagesTotal = new Counter({
  name: 'aquerii_realtime_messages_total',
  help: 'Total messages broadcast',
  labelNames: ['event'],
})

export function createMetricsServer(port = 9102): http.Server {
  const server = http.createServer(async (_req, res) => {
    const response = res as ServerResponse
    try {
      response.setHeader('Content-Type', register.contentType)
      ;(response as any).end(await register.metrics())
    } catch (err) {
      response.writeHead(500)
      ;(response as any).end(String(err))
    }
  })
  server.listen(port, () => {
    logger.info({ port }, 'Metrics server listening')
  })
  return server
}

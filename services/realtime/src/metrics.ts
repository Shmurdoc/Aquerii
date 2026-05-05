import http from 'http'
import { register, collectDefaultMetrics, Counter, Gauge } from 'prom-client'

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
    try {
      res.setHeader('Content-Type', register.contentType)
      res.end(await register.metrics())
    } catch (err) {
      res.writeHead(500)
      res.end(String(err))
    }
  })
  server.listen(port, () => {
    console.log(`Metrics server listening on :${port}`)
  })
  return server
}

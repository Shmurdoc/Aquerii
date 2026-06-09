"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesTotal = exports.roomCount = exports.connectedClients = void 0;
exports.createMetricsServer = createMetricsServer;
const http_1 = __importDefault(require("http"));
const prom_client_1 = require("prom-client");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ level: process.env.LOG_LEVEL ?? 'info' });
(0, prom_client_1.collectDefaultMetrics)({ prefix: 'aquerii_realtime_' });
exports.connectedClients = new prom_client_1.Gauge({
    name: 'aquerii_realtime_connected_clients',
    help: 'Number of currently connected Socket.IO clients',
});
exports.roomCount = new prom_client_1.Gauge({
    name: 'aquerii_realtime_room_count',
    help: 'Number of active rooms',
});
exports.messagesTotal = new prom_client_1.Counter({
    name: 'aquerii_realtime_messages_total',
    help: 'Total messages broadcast',
    labelNames: ['event'],
});
function createMetricsServer(port = 9102) {
    const server = http_1.default.createServer(async (_req, res) => {
        const response = res;
        try {
            response.setHeader('Content-Type', prom_client_1.register.contentType);
            response.end(await prom_client_1.register.metrics());
        }
        catch (err) {
            response.writeHead(500);
            response.end(String(err));
        }
    });
    server.listen(port, () => {
        logger.info({ port }, 'Metrics server listening');
    });
    return server;
}
//# sourceMappingURL=metrics.js.map
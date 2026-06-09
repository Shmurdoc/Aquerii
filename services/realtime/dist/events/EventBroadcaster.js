"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBroadcaster = void 0;
const axios_1 = __importDefault(require("axios"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ level: process.env.LOG_LEVEL ?? 'info' });
class EventBroadcaster {
    constructor(io, redis, apiUrl, apiSecret) {
        this.io = io;
        this.redis = redis;
        this.apiUrl = apiUrl;
        this.apiSecret = apiSecret;
        // A dedicated duplicate connection is required for subscribe mode
        this.subscriber = redis.duplicate();
    }
    /**
     * Subscribe to the Redis channel and begin forwarding events to Socket.IO rooms.
     * Must be called once during server bootstrap.
     */
    async start() {
        await this.subscriber.subscribe('realtime:events');
        this.subscriber.on('message', (_channel, message) => {
            try {
                const event = JSON.parse(message);
                this.broadcast(event);
            }
            catch (err) {
                logger.error({ err }, 'Failed to parse event');
            }
        });
        logger.info('Subscribed to realtime:events');
    }
    broadcast(event) {
        this.io.to(event.room).emit(event.event_type, {
            ...(event.payload ?? {}),
            _seq: event.sequence,
        });
    }
    /**
     * Replays events missed by a client by fetching from the API DB and emitting
     * them directly to the reconnecting socket.
     */
    async replayMissed(room, fromSequence, socket) {
        if (fromSequence <= 0)
            return;
        try {
            const res = await axios_1.default.get(`${this.apiUrl}/internal/realtime/events`, {
                headers: { 'X-Internal-Secret': this.apiSecret },
                params: { room, from_sequence: fromSequence },
                timeout: 5000,
            });
            const events = res.data?.events ?? [];
            for (const event of events) {
                socket.emit(event.event_type, {
                    ...(event.payload ?? {}),
                    _seq: event.sequence,
                });
            }
        }
        catch (err) {
            logger.error({ err }, 'replayMissed failed');
        }
    }
    /**
     * Gracefully unsubscribes and closes the subscriber connection.
     */
    async stop() {
        await this.subscriber.unsubscribe();
        this.subscriber.disconnect();
    }
}
exports.EventBroadcaster = EventBroadcaster;
//# sourceMappingURL=EventBroadcaster.js.map
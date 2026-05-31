"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatHandler = registerChatHandler;
const zod_1 = require("zod");
const index_1 = require("../index");
const axios_1 = __importDefault(require("axios"));
const API_URL = process.env.API_URL ?? 'http://api:8000';
const API_SECRET = process.env.REALTIME_SECRET ?? process.env.INTERNAL_API_KEY ?? '';
const ChatMessageSchema = zod_1.z.object({
    channelId: zod_1.z.string().uuid(),
    body: zod_1.z.string().min(1).max(10000),
    replyTo: zod_1.z.string().uuid().optional(),
    tempId: zod_1.z.string().optional(),
});
const ChatTypingSchema = zod_1.z.object({
    channelId: zod_1.z.string().uuid(),
});
const ChatReadSchema = zod_1.z.object({
    channelId: zod_1.z.string().uuid(),
});
function registerChatHandler(socket, user) {
    // ── Send message ───────────────────────────────────────────────────────────
    socket.on('chat:message:send', async (raw) => {
        const parsed = ChatMessageSchema.safeParse(raw);
        if (!parsed.success) {
            socket.emit('error', { event: 'chat:message:send', issues: parsed.error.issues });
            return;
        }
        const { channelId, body, replyTo, tempId } = parsed.data;
        try {
            // Persist message via API
            const res = await axios_1.default.post(`${API_URL}/api/workspaces/${user.workspace_id}/chat/channels/${channelId}/messages`, { body, reply_to: replyTo }, {
                headers: {
                    'Authorization': `Bearer ${API_SECRET}`,
                    'Content-Type': 'application/json',
                    'X-Internal-Key': API_SECRET,
                },
            });
            const message = res.data.data;
            // Broadcast to channel room
            socket.to(`chat:${channelId}`).emit('chat:message:new', {
                id: message.id,
                channelId,
                userId: user.sub,
                userName: user.name,
                body: message.body,
                replyTo: message.reply_to,
                createdAt: message.created_at,
            });
            // Also emit back to sender for confirmation
            socket.emit('chat:message:sent', {
                tempId,
                id: message.id,
                channelId,
                createdAt: message.created_at,
            });
            index_1.logger.debug({ channelId, userId: user.sub }, 'chat message sent');
        }
        catch (err) {
            index_1.logger.error({ err, channelId }, 'chat:message:send error');
            socket.emit('error', { event: 'chat:message:send', message: 'Failed to send message' });
        }
    });
    // ── Join chat channel room ─────────────────────────────────────────────────
    socket.on('chat:join', (raw) => {
        const parsed = ChatTypingSchema.safeParse(raw);
        if (!parsed.success)
            return;
        const { channelId } = parsed.data;
        socket.join(`chat:${channelId}`);
        index_1.logger.debug({ channelId, userId: user.sub }, 'joined chat channel');
    });
    // ── Leave chat channel room ────────────────────────────────────────────────
    socket.on('chat:leave', (raw) => {
        const parsed = ChatTypingSchema.safeParse(raw);
        if (!parsed.success)
            return;
        const { channelId } = parsed.data;
        socket.leave(`chat:${channelId}`);
        index_1.logger.debug({ channelId, userId: user.sub }, 'left chat channel');
    });
    // ── Typing indicator ───────────────────────────────────────────────────────
    socket.on('chat:typing', (raw) => {
        const parsed = ChatTypingSchema.safeParse(raw);
        if (!parsed.success)
            return;
        const { channelId } = parsed.data;
        socket.to(`chat:${channelId}`).emit('chat:typing', {
            channelId,
            userId: user.sub,
            userName: user.name,
        });
    });
    // ── Mark as read ───────────────────────────────────────────────────────────
    socket.on('chat:read', async (raw) => {
        const parsed = ChatReadSchema.safeParse(raw);
        if (!parsed.success)
            return;
        const { channelId } = parsed.data;
        try {
            await axios_1.default.post(`${API_URL}/api/workspaces/${user.workspace_id}/chat/channels/${channelId}/read`, {}, {
                headers: {
                    'Authorization': `Bearer ${API_SECRET}`,
                    'X-Internal-Key': API_SECRET,
                },
            });
            // Broadcast read receipt
            socket.to(`chat:${channelId}`).emit('chat:read', {
                channelId,
                userId: user.sub,
                readAt: new Date().toISOString(),
            });
        }
        catch (err) {
            index_1.logger.error({ err, channelId }, 'chat:read error');
        }
    });
}
//# sourceMappingURL=chatHandler.js.map
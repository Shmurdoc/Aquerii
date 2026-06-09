"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCatchupHandler = registerCatchupHandler;
const zod_1 = require("zod");
// ── Zod schemas ───────────────────────────────────────────────────────────────
const RoomJoinSchema = zod_1.z.object({
    resourceType: zod_1.z.enum(['board', 'document']),
    resourceId: zod_1.z.string().min(1),
    lastSequence: zod_1.z.number().int().optional(),
});
const RoomLeaveSchema = zod_1.z.object({
    resourceType: zod_1.z.enum(['board', 'document']),
    resourceId: zod_1.z.string().min(1),
});
const PresenceTypingSchema = zod_1.z.object({
    room: zod_1.z.string().min(1),
    typing: zod_1.z.boolean(),
});
function registerCatchupHandler(socket, payload, roomManager, presenceManager, broadcaster) {
    // ── room:join ──────────────────────────────────────────────────────────────
    socket.on('room:join', async (raw) => {
        const parsed = RoomJoinSchema.safeParse(raw);
        if (!parsed.success) {
            socket.emit('error', { event: 'room:join', issues: parsed.error.issues });
            return;
        }
        const data = parsed.data;
        try {
            await roomManager.join(socket, payload, data.resourceType, data.resourceId);
            const room = roomManager.roomKey(payload.workspace_id, data.resourceType, data.resourceId);
            await presenceManager.userJoined(socket, room, {
                userId: payload.sub,
                name: payload.name ?? 'Unknown',
                avatarUrl: payload.avatar_url,
            });
            socket.emit('room:joined', { room });
            if (data.lastSequence != null) {
                await broadcaster.replayMissed(room, data.lastSequence, socket);
            }
        }
        catch (err) {
            socket.emit('room:error', { message: 'Failed to join room' });
            console.error('[catchupHandler] room:join error:', err);
        }
    });
    // ── room:leave ─────────────────────────────────────────────────────────────
    socket.on('room:leave', async (raw) => {
        const parsed = RoomLeaveSchema.safeParse(raw);
        if (!parsed.success) {
            socket.emit('error', { event: 'room:leave', issues: parsed.error.issues });
            return;
        }
        const data = parsed.data;
        try {
            const room = roomManager.roomKey(payload.workspace_id, data.resourceType, data.resourceId);
            await roomManager.leave(socket, data.resourceType, data.resourceId, payload.workspace_id);
            await presenceManager.userLeft(socket, room, payload.sub);
            socket.emit('room:left', { room });
        }
        catch (err) {
            console.error('[catchupHandler] room:leave error:', err);
        }
    });
    // ── presence:typing ────────────────────────────────────────────────────────
    socket.on('presence:typing', async (raw) => {
        const parsed = PresenceTypingSchema.safeParse(raw);
        if (!parsed.success) {
            socket.emit('error', { event: 'presence:typing', issues: parsed.error.issues });
            return;
        }
        const data = parsed.data;
        try {
            if (data.typing) {
                await presenceManager.startTyping(socket, data.room, payload.sub, payload.name ?? '');
            }
            else {
                await presenceManager.stopTyping(socket, data.room, payload.sub);
            }
        }
        catch (err) {
            console.error('[catchupHandler] presence:typing error:', err);
        }
    });
    // ── disconnect ─────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
        const rooms = socket.data.rooms || new Set();
        for (const room of rooms) {
            try {
                await presenceManager.userLeft(socket, room, payload.sub);
            }
            catch (err) {
                console.error('[catchupHandler] disconnect presence cleanup error:', err);
            }
        }
        await roomManager.leaveAll(socket);
    });
}
//# sourceMappingURL=catchupHandler.js.map
// src/handlers/index.ts — registers all socket event handlers
import type { Server } from 'socket.io';
import type { RoomManager } from '../rooms/RoomManager';
import type { EventBroadcaster } from '../broadcaster/EventBroadcaster';
import { registerDocumentHandlers } from './documentHandlers';
import { registerPresenceHandlers } from './presenceHandlers';
import { logger } from '../index';

export function registerHandlers(
  io: Server,
  roomManager: RoomManager,
  broadcaster: EventBroadcaster
): void {
  io.on('connection', (socket) => {
    const { userId, workspaceId, name } = socket.data;

    logger.info({ userId, workspaceId }, 'Client connected');

    // Join workspace room automatically
    socket.join(`workspace:${workspaceId}`);

    // ── Room management ──────────────────────────────────────
    socket.on('room:join', async ({ room }: { room: string }) => {
      if (!isAllowedRoom(room, workspaceId)) {
        socket.emit('error', { code: 'ROOM_FORBIDDEN' });
        return;
      }
      await roomManager.join(socket, room);

      // Send missed events since last sequence
      const since = socket.handshake.auth?.lastSequence ?? 0;
      await broadcaster.replayMissed(socket, room, since);
    });

    socket.on('room:leave', async ({ room }: { room: string }) => {
      await roomManager.leave(socket, room);
    });

    // ── Document collaboration (Y.js) ────────────────────────
    registerDocumentHandlers(socket, io, workspaceId);

    // ── Presence ─────────────────────────────────────────────
    registerPresenceHandlers(socket, io, workspaceId, userId, name);

    // ── Disconnect ───────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info({ userId, reason }, 'Client disconnected');
      roomManager.cleanup(socket);
    });
  });
}

/** Enforce that room belongs to the authenticated workspace */
function isAllowedRoom(room: string, workspaceId: string): boolean {
  // All rooms are prefixed with workspace:{id}:* or board:{id} (board ids are workspace-scoped)
  // Simple check: rooms must not reference a different workspace
  if (room.startsWith('workspace:') && !room.startsWith(`workspace:${workspaceId}`)) {
    return false;
  }
  return true;
}

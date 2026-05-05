// src/handlers/catchupHandler.ts — room:join / room:leave / presence:typing / disconnect
import type { Socket } from 'socket.io'
import type { RoomManager } from '../rooms/RoomManager'
import type { PresenceManager } from '../presence/PresenceManager'
import type { EventBroadcaster } from '../events/EventBroadcaster'
import type { JWTPayload } from '../auth/jwt'

export function registerCatchupHandler(
  socket: Socket,
  payload: JWTPayload,
  roomManager: RoomManager,
  presenceManager: PresenceManager,
  broadcaster: EventBroadcaster,
): void {
  // ── room:join ─────────────────────────────────────────────────────────────
  socket.on(
    'room:join',
    async (data: {
      resourceType: 'board' | 'document'
      resourceId: string
      lastSequence?: number
    }) => {
      try {
        await roomManager.join(socket, payload, data.resourceType, data.resourceId)
        const room = roomManager.roomKey(payload.workspace_id, data.resourceType, data.resourceId)

        await presenceManager.userJoined(socket, room, {
          userId:    payload.sub,
          name:      payload.name ?? 'Unknown',
          avatarUrl: payload.avatar_url,
        })

        socket.emit('room:joined', { room })

        // Replay any events the client missed since it was last connected
        if (data.lastSequence != null) {
          await broadcaster.replayMissed(room, data.lastSequence, socket)
        }
      } catch (err) {
        socket.emit('room:error', { message: 'Failed to join room' })
        console.error('[catchupHandler] room:join error:', err)
      }
    },
  )

  // ── room:leave ────────────────────────────────────────────────────────────
  socket.on(
    'room:leave',
    async (data: { resourceType: 'board' | 'document'; resourceId: string }) => {
      try {
        const room = roomManager.roomKey(payload.workspace_id, data.resourceType, data.resourceId)
        await roomManager.leave(socket, data.resourceType, data.resourceId, payload.workspace_id)
        await presenceManager.userLeft(socket, room, payload.sub)
        socket.emit('room:left', { room })
      } catch (err) {
        console.error('[catchupHandler] room:leave error:', err)
      }
    },
  )

  // ── presence:typing ───────────────────────────────────────────────────────
  socket.on('presence:typing', async (data: { room: string; typing: boolean }) => {
    try {
      if (data.typing) {
        await presenceManager.startTyping(socket, data.room, payload.sub, payload.name ?? '')
      } else {
        await presenceManager.stopTyping(socket, data.room, payload.sub)
      }
    } catch (err) {
      console.error('[catchupHandler] presence:typing error:', err)
    }
  })

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const rooms: Set<string> = socket.data.rooms || new Set()
    for (const room of rooms) {
      try {
        await presenceManager.userLeft(socket, room, payload.sub)
      } catch (err) {
        console.error('[catchupHandler] disconnect presence cleanup error:', err)
      }
    }
    await roomManager.leaveAll(socket)
  })
}

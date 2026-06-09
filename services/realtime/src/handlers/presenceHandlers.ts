// src/handlers/presenceHandlers.ts — cursor / online presence
import type { Socket, Server } from 'socket.io'
import { logger } from '../index'

export function registerPresenceHandlers(
  socket: Socket,
  io: Server,
  workspaceId: string,
  userId: string,
  name: string
): void {
  // When a user joins a room, broadcast their presence to others
  socket.on('presence:enter', ({ room, meta }: { room: string; meta?: Record<string, unknown> }) => {
    socket.to(room).emit('presence:join', {
      userId,
      name,
      socketId: socket.id,
      meta: meta ?? {},
    })
    logger.debug({ userId, room }, 'presence:enter')
  })

  // Cursor movement
  socket.on('presence:cursor', ({ room, cursor }: { room: string; cursor: unknown }) => {
    socket.to(room).emit('presence:cursor', {
      userId,
      cursor,
    })
  })

  // Explicit leave
  socket.on('presence:leave', ({ room }: { room: string }) => {
    socket.to(room).emit('presence:leave', { userId, socketId: socket.id })
  })

  // On disconnect, broadcast departure from all joined rooms
  socket.on('disconnect', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        io.to(room).emit('presence:leave', { userId, socketId: socket.id })
      }
    }
  })
}

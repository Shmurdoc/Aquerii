// src/rooms/RoomManager.ts — tracks room membership, cleanup
import type { Server, Socket } from 'socket.io'
import type { Redis } from 'ioredis'
import { logger } from '../index'

export class RoomManager {
  constructor(private io: Server, private redis: Redis) {}

  async join(socket: Socket, room: string): Promise<void> {
    socket.join(room)
    await this.redis.sadd(`room_members:${room}`, socket.data.userId)
    logger.debug({ userId: socket.data.userId, room }, 'joined room')

    // Broadcast join to room
    socket.to(room).emit('room:member_joined', {
      userId:   socket.data.userId,
      name:     socket.data.name,
      socketId: socket.id,
    })
  }

  async leave(socket: Socket, room: string): Promise<void> {
    socket.leave(room)
    // Only remove from Redis if user has no other sockets in room
    const sockets = await this.io.in(room).fetchSockets()
    const stillPresent = sockets.some(s => s.data.userId === socket.data.userId && s.id !== socket.id)

    if (!stillPresent) {
      await this.redis.srem(`room_members:${room}`, socket.data.userId)
    }

    socket.to(room).emit('room:member_left', {
      userId:   socket.data.userId,
      socketId: socket.id,
    })
  }

  async cleanup(socket: Socket): Promise<void> {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        await this.leave(socket, room)
      }
    }
  }
}

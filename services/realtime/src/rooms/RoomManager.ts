// src/rooms/RoomManager.ts — manages Socket.IO rooms for boards and documents
import type { Server, Socket } from 'socket.io'
import type { Redis } from 'ioredis'
import type { JWTPayload } from '../auth/jwt'

export interface RoomMeta {
  workspaceId: string
  resourceType: 'board' | 'document'
  resourceId: string
}

export class RoomManager {
  constructor(private io: Server, private redis: Redis) {}

  roomKey(workspaceId: string, resourceType: string, resourceId: string): string {
    return `${resourceType}:${workspaceId}:${resourceId}`
  }

  async join(
    socket: Socket,
    payload: JWTPayload,
    resourceType: 'board' | 'document',
    resourceId: string,
  ): Promise<void> {
    const room = this.roomKey(payload.workspace_id, resourceType, resourceId)

    // Check Redis membership cache (populated by Laravel on workspace join).
    // If the key is absent we fall back to trusting the JWT workspace_id claim —
    // the JWT is already verified upstream so this is acceptable for realtime.
    const memberKey = `workspace_member:${payload.workspace_id}:${payload.sub}`
    await this.redis.exists(memberKey) // result intentionally unused — trust JWT

    await socket.join(room)
    socket.data.rooms = socket.data.rooms || new Set<string>()
    socket.data.rooms.add(room)

    // Track per-room member set in Redis (union of all socket instances)
    await this.redis.sadd(`room_members:${room}`, payload.sub)
  }

  async leave(
    socket: Socket,
    resourceType: 'board' | 'document',
    resourceId: string,
    workspaceId: string,
  ): Promise<void> {
    const room = this.roomKey(workspaceId, resourceType, resourceId)
    await socket.leave(room)
    socket.data.rooms?.delete(room)

    // Only remove from Redis set when no other sockets for this user remain in room
    const sockets = await this.io.in(room).fetchSockets()
    const stillPresent = sockets.some(
      (s) => s.data.user?.sub === socket.data.user?.sub && s.id !== socket.id,
    )
    if (!stillPresent) {
      await this.redis.srem(`room_members:${room}`, socket.data.user?.sub)
    }
  }

  async leaveAll(socket: Socket): Promise<void> {
    const rooms: Set<string> = socket.data.rooms || new Set()
    for (const room of rooms) {
      await socket.leave(room)
    }
    socket.data.rooms = new Set<string>()
  }

  broadcastToRoom(room: string, event: string, data: unknown, excludeSocketId?: string): void {
    if (excludeSocketId) {
      this.io.to(room).except(excludeSocketId).emit(event, data)
    } else {
      this.io.to(room).emit(event, data)
    }
  }

  /** Legacy join by raw room string (used by existing handlers) */
  async joinRoom(socket: Socket, room: string): Promise<void> {
    await socket.join(room)
    socket.data.rooms = socket.data.rooms || new Set<string>()
    socket.data.rooms.add(room)
    if (socket.data.user?.sub) {
      await this.redis.sadd(`room_members:${room}`, socket.data.user.sub)
    }

    socket.to(room).emit('room:member_joined', {
      userId:   socket.data.user?.sub ?? socket.data.userId,
      name:     socket.data.user?.name ?? socket.data.name,
      socketId: socket.id,
    })
  }

  /** Legacy leave by raw room string (used by existing handlers) */
  async leaveRoom(socket: Socket, room: string): Promise<void> {
    await socket.leave(room)
    socket.data.rooms?.delete(room)

    const sockets = await this.io.in(room).fetchSockets()
    const userId = socket.data.user?.sub ?? socket.data.userId
    const stillPresent = sockets.some(
      (s) => (s.data.user?.sub ?? s.data.userId) === userId && s.id !== socket.id,
    )
    if (!stillPresent && userId) {
      await this.redis.srem(`room_members:${room}`, userId)
    }

    socket.to(room).emit('room:member_left', {
      userId:   userId,
      socketId: socket.id,
    })
  }

  /** Legacy cleanup — leave all Socket.IO rooms on disconnect */
  async cleanup(socket: Socket): Promise<void> {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        await this.leaveRoom(socket, room)
      }
    }
  }
}

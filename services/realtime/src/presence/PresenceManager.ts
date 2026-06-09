// src/presence/PresenceManager.ts — online presence and typing indicators via Redis
import type { Server, Socket } from 'socket.io'
import type { Redis } from 'ioredis'

export interface PresenceUser {
  userId: string
  name: string
  avatarUrl?: string
  cursor?: { x: number; y: number }
}

export class PresenceManager {
  constructor(private io: Server, private redis: Redis) {}

  private presenceKey(room: string): string {
    return `presence:${room}`
  }

  private typingKey(room: string): string {
    return `typing:${room}`
  }

  /**
   * Called when a user joins a room.
   * Sends a presence snapshot to the joining socket and broadcasts the join to the room.
   */
  async userJoined(socket: Socket, room: string, user: PresenceUser): Promise<void> {
    const key = this.presenceKey(room)
    await this.redis.hset(key, user.userId, JSON.stringify(user))
    await this.redis.expire(key, 3600)

    const allPresence = await this.getPresence(room)

    // Send current presence snapshot to the joining user
    socket.emit('presence:snapshot', { room, users: allPresence })

    // Broadcast join to everyone else in the room
    socket.to(room).emit('presence:joined', { room, user })
  }

  /**
   * Called when a user leaves a room or disconnects.
   * Cleans up Redis state and broadcasts departure.
   */
  async userLeft(socket: Socket, room: string, userId: string): Promise<void> {
    const key = this.presenceKey(room)
    await this.redis.hdel(key, userId)
    await this.redis.hdel(this.typingKey(room), userId)
    this.io.to(room).emit('presence:left', { room, userId })
  }

  /**
   * Refreshes the presence hash TTL; call periodically from client heartbeats.
   */
  async heartbeat(userId: string, room: string): Promise<void> {
    const key = this.presenceKey(room)
    const existing = await this.redis.hget(key, userId)
    if (existing) {
      await this.redis.expire(key, 3600)
    }
  }

  /**
   * Marks a user as typing in the given room and broadcasts to peers.
   */
  async startTyping(socket: Socket, room: string, userId: string, userName: string): Promise<void> {
    const key = this.typingKey(room)
    await this.redis.hset(key, userId, userName)
    await this.redis.expire(key, 10)
    socket.to(room).emit('presence:typing', { room, userId, userName, typing: true })
  }

  /**
   * Removes the typing indicator for a user and broadcasts to peers.
   */
  async stopTyping(socket: Socket, room: string, userId: string): Promise<void> {
    const key = this.typingKey(room)
    await this.redis.hdel(key, userId)
    socket.to(room).emit('presence:typing', { room, userId, typing: false })
  }

  /**
   * Returns all users currently present in a room.
   */
  async getPresence(room: string): Promise<PresenceUser[]> {
    const key = this.presenceKey(room)
    const raw = await this.redis.hgetall(key)
    if (!raw) return []
    return Object.values(raw).map((v) => JSON.parse(v) as PresenceUser)
  }

  /**
   * Updates the cursor position for a user and broadcasts to peers.
   */
  async updateCursor(
    socket: Socket,
    room: string,
    userId: string,
    cursor: { x: number; y: number },
  ): Promise<void> {
    const key = this.presenceKey(room)
    const raw = await this.redis.hget(key, userId)
    if (raw) {
      const user: PresenceUser = JSON.parse(raw)
      user.cursor = cursor
      await this.redis.hset(key, userId, JSON.stringify(user))
    }
    socket.to(room).emit('presence:cursor', { room, userId, cursor })
  }
}

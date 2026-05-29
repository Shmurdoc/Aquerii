// src/handlers/chatHandler.ts — real-time chat messaging
import type { Socket } from 'socket.io'
import { z } from 'zod'
import { logger } from '../index'
import axios from 'axios'

const API_URL    = process.env.API_URL ?? 'http://api:8000'
const API_SECRET = process.env.REALTIME_SECRET ?? process.env.INTERNAL_API_KEY ?? ''

const ChatMessageSchema = z.object({
  channelId: z.string().uuid(),
  body:      z.string().min(1).max(10000),
  replyTo:   z.string().uuid().optional(),
  tempId:    z.string().optional(),
})

const ChatTypingSchema = z.object({
  channelId: z.string().uuid(),
})

const ChatReadSchema = z.object({
  channelId: z.string().uuid(),
})

export function registerChatHandler(
  socket: Socket,
  user: { sub: string; workspace_id: string; name: string },
): void {
  // ── Send message ───────────────────────────────────────────────────────────
  socket.on('chat:message:send', async (raw: unknown) => {
    const parsed = ChatMessageSchema.safeParse(raw)
    if (!parsed.success) {
      socket.emit('error', { event: 'chat:message:send', issues: parsed.error.issues })
      return
    }

    const { channelId, body, replyTo, tempId } = parsed.data

    try {
      // Persist message via API
      const res = await axios.post(
        `${API_URL}/api/workspaces/${user.workspace_id}/chat/channels/${channelId}/messages`,
        { body, reply_to: replyTo },
        {
          headers: {
            'Authorization': `Bearer ${API_SECRET}`,
            'Content-Type': 'application/json',
            'X-Internal-Key': API_SECRET,
          },
        },
      )

      const message = res.data.data

      // Broadcast to channel room
      socket.to(`chat:${channelId}`).emit('chat:message:new', {
        id: message.id,
        channelId,
        userId: user.sub,
        userName: user.name,
        body: message.body,
        replyTo: message.reply_to,
        createdAt: message.created_at,
      })

      // Also emit back to sender for confirmation
      socket.emit('chat:message:sent', {
        tempId,
        id: message.id,
        channelId,
        createdAt: message.created_at,
      })

      logger.debug({ channelId, userId: user.sub }, 'chat message sent')
    } catch (err) {
      logger.error({ err, channelId }, 'chat:message:send error')
      socket.emit('error', { event: 'chat:message:send', message: 'Failed to send message' })
    }
  })

  // ── Join chat channel room ─────────────────────────────────────────────────
  socket.on('chat:join', (raw: unknown) => {
    const parsed = ChatTypingSchema.safeParse(raw)
    if (!parsed.success) return

    const { channelId } = parsed.data
    socket.join(`chat:${channelId}`)
    logger.debug({ channelId, userId: user.sub }, 'joined chat channel')
  })

  // ── Leave chat channel room ────────────────────────────────────────────────
  socket.on('chat:leave', (raw: unknown) => {
    const parsed = ChatTypingSchema.safeParse(raw)
    if (!parsed.success) return

    const { channelId } = parsed.data
    socket.leave(`chat:${channelId}`)
    logger.debug({ channelId, userId: user.sub }, 'left chat channel')
  })

  // ── Typing indicator ───────────────────────────────────────────────────────
  socket.on('chat:typing', (raw: unknown) => {
    const parsed = ChatTypingSchema.safeParse(raw)
    if (!parsed.success) return

    const { channelId } = parsed.data
    socket.to(`chat:${channelId}`).emit('chat:typing', {
      channelId,
      userId: user.sub,
      userName: user.name,
    })
  })

  // ── Mark as read ───────────────────────────────────────────────────────────
  socket.on('chat:read', async (raw: unknown) => {
    const parsed = ChatReadSchema.safeParse(raw)
    if (!parsed.success) return

    const { channelId } = parsed.data

    try {
      await axios.post(
        `${API_URL}/api/workspaces/${user.workspace_id}/chat/channels/${channelId}/read`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${API_SECRET}`,
            'X-Internal-Key': API_SECRET,
          },
        },
      )

      // Broadcast read receipt
      socket.to(`chat:${channelId}`).emit('chat:read', {
        channelId,
        userId: user.sub,
        readAt: new Date().toISOString(),
      })
    } catch (err) {
      logger.error({ err, channelId }, 'chat:read error')
    }
  })
}

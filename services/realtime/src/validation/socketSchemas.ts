import { z } from 'zod'

export const roomJoinSchema = z.object({
  roomId: z.string(),
  workspaceId: z.string(),
})

export const roomLeaveSchema = z.object({
  roomId: z.string(),
})

export const docUpdateSchema = z.object({
  documentId: z.string(),
  content: z.string(),
  version: z.number(),
})

export const cursorUpdateSchema = z.object({
  roomId: z.string(),
  x: z.number(),
  y: z.number(),
})

export const typingSchema = z.object({
  roomId: z.string(),
  isTyping: z.boolean(),
})

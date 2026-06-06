import type { Socket } from 'socket.io'
import type { ZodSchema } from 'zod'

type EventHandler<T> = (data: T, socket: Socket) => void | Promise<void>

export function validateSocketEvent<T>(
  schema: ZodSchema<T>,
  handler: EventHandler<T>,
): (raw: unknown, socket: Socket) => Promise<void> {
  return async (raw: unknown, socket: Socket) => {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      socket.emit('validation:error', {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      })
      return
    }
    await handler(parsed.data, socket)
  }
}

// src/broadcaster/EventBroadcaster.ts — broadcasts events to rooms, replays missed
import type { Server, Socket } from 'socket.io'
import type { Redis } from 'ioredis'
import { logger } from '../index'

export class EventBroadcaster {
  constructor(private io: Server, private redis: Redis) {}

  broadcast(event: {
    room: string
    type: string
    payload: unknown
    actor_id?: string
    sequence?: number
  }): void {
    this.io.to(event.room).emit('event', {
      type:     event.type,
      payload:  event.payload,
      actor_id: event.actor_id,
      sequence: event.sequence,
    })
  }

  /**
   * Send all events in a room since `lastSequence` to a single socket.
   * Pulls from the PostgreSQL realtime_events table via the API.
   */
  async replayMissed(socket: Socket, room: string, lastSequence: number): Promise<void> {
    if (lastSequence <= 0) return

    try {
      const { default: axios } = await import('axios')
      const res = await axios.get('http://api:8000/api/internal/realtime-events', {
        params: { room, since: lastSequence },
        headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY ?? '' },
      })

      const events: Array<{ type: string; payload: unknown; sequence: number }> = res.data.data ?? []

      for (const ev of events) {
        socket.emit('event', ev)
      }

      logger.debug({ room, lastSequence, replayed: events.length }, 'replayed missed events')
    } catch (e) {
      logger.warn({ err: e, room }, 'Failed to replay missed events')
    }
  }
}

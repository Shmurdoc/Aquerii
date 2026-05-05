// src/events/EventBroadcaster.ts — listens to Redis pub/sub and fans out to Socket.IO rooms
import type { Server, Socket } from 'socket.io'
import { Redis } from 'ioredis'
import axios from 'axios'

interface RealtimeEvent {
  room: string
  event_type: string
  payload: unknown
  sequence: number
}

export class EventBroadcaster {
  private subscriber: Redis

  constructor(
    private io: Server,
    private redis: Redis,
    private apiUrl: string,
    private apiSecret: string,
  ) {
    // A dedicated duplicate connection is required for subscribe mode
    this.subscriber = redis.duplicate()
  }

  /**
   * Subscribe to the Redis channel and begin forwarding events to Socket.IO rooms.
   * Must be called once during server bootstrap.
   */
  async start(): Promise<void> {
    await this.subscriber.subscribe('realtime:events')
    this.subscriber.on('message', (_channel: string, message: string) => {
      try {
        const event: RealtimeEvent = JSON.parse(message)
        this.broadcast(event)
      } catch (err) {
        console.error('[EventBroadcaster] Failed to parse event:', err)
      }
    })
    console.log('[EventBroadcaster] Subscribed to realtime:events')
  }

  private broadcast(event: RealtimeEvent): void {
    this.io.to(event.room).emit(event.event_type, {
      ...((event.payload as object) ?? {}),
      _seq: event.sequence,
    })
  }

  /**
   * Replays events missed by a client by fetching from the API DB and emitting
   * them directly to the reconnecting socket.
   */
  async replayMissed(room: string, fromSequence: number, socket: Socket): Promise<void> {
    if (fromSequence <= 0) return

    try {
      const res = await axios.get(`${this.apiUrl}/internal/realtime/events`, {
        headers: { 'X-Internal-Secret': this.apiSecret },
        params: { room, from_sequence: fromSequence },
        timeout: 5000,
      })
      const events: RealtimeEvent[] = (res.data?.events as RealtimeEvent[]) ?? []
      for (const event of events) {
        socket.emit(event.event_type, {
          ...((event.payload as object) ?? {}),
          _seq: event.sequence,
        })
      }
    } catch (err) {
      console.error('[EventBroadcaster] replayMissed failed:', err)
    }
  }

  /**
   * Gracefully unsubscribes and closes the subscriber connection.
   */
  async stop(): Promise<void> {
    await this.subscriber.unsubscribe()
    this.subscriber.disconnect()
  }
}

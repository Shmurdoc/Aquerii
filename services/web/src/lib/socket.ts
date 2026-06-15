import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import type { AppNotification } from '@/stores/notificationStore'

let socket: Socket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let genericReconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_BACKOFF = 300_000 // 5 minutes
const GENERIC_DISCONNECT_GRACE_MS = 30_000

// Backoff sequence: 10s → 30s → 60s → 5min
const BACKOFF_SEQUENCE = [10_000, 30_000, 60_000, 300_000]

export interface SocketEventMap {
  notification: (n: AppNotification) => void
  'notification:read': (notificationId: string) => void
  'room:joined': (data: { room: string }) => void
  'room:left': (data: { room: string }) => void
  connect: () => void
  disconnect: (reason: string) => void
  connect_error: (err: Error) => void
}

type CriticalHandler = () => Promise<void> | void
let criticalFallbacks: Map<string, CriticalHandler> = new Map()

export function registerCriticalFallback(key: string, handler: CriticalHandler) {
  criticalFallbacks.set(key, handler)
}

export function unregisterCriticalFallback(key: string) {
  criticalFallbacks.delete(key)
}

export function isConnected(): boolean {
  return socket?.connected ?? false
}

function getBackoffDelay(attempt: number): number {
  const index = Math.min(attempt, BACKOFF_SEQUENCE.length - 1)
  return BACKOFF_SEQUENCE[index]
}

async function runCriticalFallbacks() {
  for (const [key, handler] of criticalFallbacks) {
    try {
      await handler()
    } catch (err) {
      console.error(`[realtime] critical fallback "${key}" failed`, err)
    }
  }
}

function attachGlobalListeners(s: Socket) {
  s.on('connect', () => {
    reconnectAttempts = 0
    if (genericReconnectTimer) {
      clearTimeout(genericReconnectTimer)
      genericReconnectTimer = null
    }
    if (import.meta.env.DEV) console.debug('[realtime] connected', s.id)
  })

  s.on('disconnect', (reason) => {
    if (import.meta.env.DEV) console.debug('[realtime] disconnected', reason)

    if (reason === 'io server disconnect') {
      refreshTokenAndReconnect()
      return
    }

    if (reason === 'io client disconnect') {
      return
    }

    // Run critical fallbacks immediately when disconnected
    runCriticalFallbacks()

    if (genericReconnectTimer) clearTimeout(genericReconnectTimer)
    genericReconnectTimer = setTimeout(() => {
      genericReconnectTimer = null
      if (!socket?.connected) {
        refreshTokenAndReconnect()
      }
    }, GENERIC_DISCONNECT_GRACE_MS)
  })

  s.on('connect_error', (err) => {
    reconnectAttempts++
    // Apply exponential backoff for reconnect on error
    const delay = getBackoffDelay(reconnectAttempts)
    if (import.meta.env.DEV) console.debug(`[realtime] connect_error backoff ${delay}ms`, err.message)

    if (
      err.message === 'AUTH_REQUIRED' ||
      err.message === 'AUTH_INVALID' ||
      reconnectAttempts >= 3
    ) {
      refreshTokenAndReconnect()
    }

    // Run critical fallbacks on persistent connect errors
    if (reconnectAttempts >= 2) {
      runCriticalFallbacks()
    }
  })

  s.on('notification', (n: AppNotification) => {
    useNotificationStore.getState().addNotification(n)
  })

  s.on('notification:read', (notificationId: string) => {
    useNotificationStore.getState().markRead(notificationId)
  })
}

export function getSocket(): Socket {
  if (socket?.connected) return socket

  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  const { token } = useAuthStore.getState()

  socket = io('/', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: MAX_BACKOFF,
    randomizationFactor: 0.5,
  })

  attachGlobalListeners(socket)

  return socket
}

async function refreshTokenAndReconnect() {
  if (reconnectTimer) return
  try {
    const { token } = useAuthStore.getState()
    if (!token) return

    const { default: axios } = await import('axios')
    const res = await axios.post('/api/auth/refresh', { token })
    const newToken: string = res.data.data?.token ?? res.data.token
    if (!newToken) throw new Error('Refresh response missing token')

    useAuthStore.setState((s) => ({ ...s, token: newToken }))

    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }
    if (genericReconnectTimer) {
      clearTimeout(genericReconnectTimer)
      genericReconnectTimer = null
    }
    reconnectAttempts = 0
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      getSocket()
    }, 500)
  } catch {
    useAuthStore.getState().logout()
    window.location.href = '/login'
  }
}

export function joinRoom(room: string, lastSequence = 0) {
  getSocket().emit('room:join', { room, lastSequence })
}

export function leaveRoom(room: string) {
  getSocket().emit('room:leave', { room })
}

import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import type { AppNotification } from '@/stores/notificationStore'

let socket: Socket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let genericReconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_BACKOFF = 30_000
const GENERIC_DISCONNECT_GRACE_MS = 30_000

export interface SocketEventMap {
  notification: (n: AppNotification) => void
  'notification:read': (notificationId: string) => void
  'room:joined': (data: { room: string }) => void
  'room:left': (data: { room: string }) => void
  connect: () => void
  disconnect: (reason: string) => void
  connect_error: (err: Error) => void
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
      // Server forced disconnect — likely auth/session expired. Refresh now.
      refreshTokenAndReconnect()
      return
    }

    if (reason === 'io client disconnect') {
      // We disconnected on purpose — do nothing.
      return
    }

    // Generic disconnect (transport close / transport error / ping timeout).
    // socket.io's built-in reconnection will retry with backoff. If it can't
    // re-establish within the grace window, force a token refresh and a
    // fresh socket so a stale token can't keep blocking us indefinitely.
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
    if (
      err.message === 'AUTH_REQUIRED' ||
      err.message === 'AUTH_INVALID' ||
      reconnectAttempts >= 3
    ) {
      refreshTokenAndReconnect()
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

  // Explicitly tear down any stale instance before creating a new one,
  // otherwise listeners on the orphaned socket can still fire and dispatch
  // into the stores after a brief network blip.
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

    // Force a fresh socket with the new token.
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

import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import type { AppNotification } from '@/stores/notificationStore'

let socket: Socket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const MAX_BACKOFF = 30_000

export interface SocketEventMap {
  notification: (n: AppNotification) => void
  'notification:read': (notificationId: string) => void
  'room:joined': (data: { room: string }) => void
  'room:left': (data: { room: string }) => void
  connect: () => void
  disconnect: (reason: string) => void
  connect_error: (err: Error) => void
}

export function getSocket(): Socket {
  if (socket?.connected) return socket

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

  socket.on('connect', () => {
    if (import.meta.env.DEV) console.debug('[realtime] connected', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    if (import.meta.env.DEV) console.debug('[realtime] disconnected', reason)
  })

  socket.on('connect_error', (err) => {
    if (err.message === 'AUTH_REQUIRED' || err.message === 'AUTH_INVALID') {
      refreshTokenAndReconnect()
    }
  })

  socket.on('notification', (n: AppNotification) => {
    useNotificationStore.getState().addNotification(n)
  })

  socket.on('notification:read', (notificationId: string) => {
    useNotificationStore.getState().markRead(notificationId)
  })

  return socket
}

async function refreshTokenAndReconnect() {
  if (reconnectTimer) return
  try {
    const { token } = useAuthStore.getState()
    if (!token) return

    const { default: axios } = await import('axios')
    const res = await axios.post('/api/auth/refresh', { token })
    const newToken = res.data.data.token

    useAuthStore.setState((s) => ({ ...s, token: newToken }))
    socket?.disconnect()
    socket = null
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

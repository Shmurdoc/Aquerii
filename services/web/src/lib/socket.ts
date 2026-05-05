import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

let socket: Socket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const MAX_BACKOFF = 30_000

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
    console.debug('[realtime] connected', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.debug('[realtime] disconnected', reason)
  })

  socket.on('connect_error', (err) => {
    if (err.message === 'AUTH_REQUIRED' || err.message === 'AUTH_INVALID') {
      // Token expired — refresh then reconnect
      refreshTokenAndReconnect()
    }
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

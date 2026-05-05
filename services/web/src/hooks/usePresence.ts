import { useEffect, useState } from 'react'
import { getSocket } from '@/lib/socket'

export interface PresenceUser {
  userId: string
  name: string
  avatarUrl?: string
}

export function usePresence(room: string | null) {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    if (!room) return

    const socket = getSocket()

    const onSnapshot = (data: { room: string; users: PresenceUser[] }) => {
      if (data.room === room) setUsers(data.users)
    }
    const onJoined = (data: { room: string; user: PresenceUser }) => {
      if (data.room === room)
        setUsers((prev) => [...prev.filter((u) => u.userId !== data.user.userId), data.user])
    }
    const onLeft = (data: { room: string; userId: string }) => {
      if (data.room === room) setUsers((prev) => prev.filter((u) => u.userId !== data.userId))
    }

    socket.on('presence:snapshot', onSnapshot)
    socket.on('presence:joined', onJoined)
    socket.on('presence:left', onLeft)

    return () => {
      socket.off('presence:snapshot', onSnapshot)
      socket.off('presence:joined', onJoined)
      socket.off('presence:left', onLeft)
    }
  }, [room])

  return users
}

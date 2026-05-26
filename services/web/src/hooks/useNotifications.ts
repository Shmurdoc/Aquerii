import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { getSocket } from '@/lib/socket'
import type { AppNotification } from '@/stores/notificationStore'

export function useNotifications() {
  const workspace = useAuthStore((s) => s.workspace)
  const { setNotifications, addNotification, markRead, markAllRead, unreadCount } = useNotificationStore()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications', workspace?.id],
    queryFn: () => api.get(`/workspaces/${workspace!.id}/notifications`).then((r) => r.data.data),
    enabled: !!workspace,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (data) setNotifications(data)
  }, [data, setNotifications])

  // Real-time socket push
  useEffect(() => {
    if (!workspace) return
    const socket = getSocket()
    const handler = (n: AppNotification) => addNotification(n)
    socket.on('notification', handler)
    return () => { socket.off('notification', handler) }
  }, [workspace, addNotification])

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/workspaces/${workspace!.id}/notifications/${id}/read`),
    onSuccess: (_data, id) => { markRead(id); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspace!.id}/notifications/read-all`),
    onSuccess: () => { markAllRead(); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  return {
    unreadCount,
    addNotification,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  }
}

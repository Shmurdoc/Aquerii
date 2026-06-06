import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, type MutateOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { getSocket } from '@/lib/socket'
import type { AppNotification } from '@/stores/notificationStore'

const PER_PAGE = 20

interface NotificationsPage {
  data: AppNotification[]
  last_page: number
  current_page: number
}

async function fetchNotificationsPage(workspaceId: string, page: number): Promise<NotificationsPage> {
  const res = await api.get(`/workspaces/${workspaceId}/notifications`, {
    params: { page, per_page: PER_PAGE },
  })
  return res.data
}

export function useNotifications() {
  const workspace = useAuthStore((s) => s.workspace)
  const { setNotifications, appendNotifications, addNotification, markRead, markAllRead, unreadCount } = useNotificationStore()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications', workspace?.id],
    queryFn: () => fetchNotificationsPage(workspace!.id, 1),
    enabled: !!workspace,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (data) setNotifications(data.data, data.current_page < data.last_page)
  }, [data, setNotifications])

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

  const loadMore = async (page: number) => {
    if (!workspace) return { hasMore: false }
    const next = await fetchNotificationsPage(workspace.id, page)
    const hasMore = next.current_page < next.last_page
    appendNotifications(next.data, hasMore)
    return { hasMore }
  }

  return {
    unreadCount,
    addNotification,
    markRead: (id: string, options?: MutateOptions<unknown, unknown, string>) =>
      markReadMutation.mutate(id, options),
    markAllRead: (options?: MutateOptions<unknown, unknown, void>) =>
      markAllReadMutation.mutate(undefined, options),
    loadMore,
  }
}

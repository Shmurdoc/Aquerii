import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'

export function useNotifications() {
  const workspace = useAuthStore((s) => s.workspace)
  const { setNotifications, addNotification, markRead, markAllRead, unreadCount } = useNotificationStore()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications', workspace?.id],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
    enabled: !!workspace,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (data) setNotifications(data)
  }, [data, setNotifications])

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: (_data, id) => { markRead(id); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => { markAllRead(); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  return {
    unreadCount,
    addNotification,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  }
}

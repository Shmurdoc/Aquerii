import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export interface CalendarItem {
  id: string
  title: string
  priority: string | null
  due_date: string
  done: boolean
  board_id: string
  board_name: string
  board_color: string | null
}

export function useCalendarItems() {
  const workspace = useAuthStore(s => s.workspace)

  return useQuery({
    queryKey: ['calendar-items', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/my-day`, {
        params: { scope: 'all' },
      })
      return res.data.data as CalendarItem[]
    },
    enabled: !!workspace,
  })
}

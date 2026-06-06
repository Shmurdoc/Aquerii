import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { format } from 'date-fns'

export type CalendarItem = {
  id: string
  type: 'task' | 'deal' | 'ticket' | 'permit' | 'incident' | 'hazard' | 'milestone'
  title: string
  due_date: string
  workspace_id: string
  link?: string
  priority?: string | null
  done?: boolean
  board_id?: string
  board_name?: string
  board_color?: string | null
}

export function useCalendarItems(from: Date, to: Date, entityType?: string) {
  const workspace = useAuthStore(s => s.workspace)

  return useQuery({
    queryKey: [
      'calendar-items',
      workspace?.id,
      format(from, 'yyyy-MM-dd'),
      format(to, 'yyyy-MM-dd'),
      entityType,
    ],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/calendar-items`, {
        params: {
          from: format(from, 'yyyy-MM-dd'),
          to: format(to, 'yyyy-MM-dd'),
          ...(entityType ? { entity_type: entityType } : {}),
        },
      })
      return (res.data.data ?? []) as CalendarItem[]
    },
    enabled: !!workspace,
  })
}

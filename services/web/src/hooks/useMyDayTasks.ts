import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export interface MyDayTask {
  id: string
  title: string
  priority: string | null
  due_date: string
  done: boolean
  board_id: string
  board_name: string
  board_color: string | null
}

export function useMyDayTasks() {
  const workspace = useAuthStore(s => s.workspace)

  return useQuery({
    queryKey: ['my-day', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/my-day`)
      return res.data.data as MyDayTask[]
    },
    enabled: !!workspace,
  })
}

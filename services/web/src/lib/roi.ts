import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export interface ROIDashboard {
  certificates_prevented_expiring: number
  access_denials_prevented: number
  avoided_downtime_hours: number
  avoided_downtime_cost: number
  compliance_rate: number
  compliance_rate_trend: { week: string; rate: number }[]
  ptw_processing_time_avg: number
  time_saved_ptw: number
  total_potential_savings: number
  platform_cost: number
  roi_ratio: number
  period: { from: string; to: string }
}

function wid(): string {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  return workspace.id
}

export function useROIDashboard(from?: string, to?: string) {
  const workspaceId = wid()
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()

  return useQuery({
    queryKey: ['roi-dashboard', workspaceId, from, to],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/roi/dashboard${qs ? `?${qs}` : ''}`)
      return res.data.data as ROIDashboard
    },
  })
}

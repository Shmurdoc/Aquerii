import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface ContractMilestone {
  id: string
  workspace_id: string
  crm_deal_id: string
  name: string
  description: string | null
  amount: number
  due_date: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

const wk = (w: string | undefined, dealId?: string) => ['crm', w, 'deals', dealId, 'milestones']

export function useMilestones(w: string | undefined, dealId: string | undefined) {
  return useQuery<{ data: ContractMilestone[] }>({
    queryKey: [...wk(w, dealId)],
    queryFn: () => api.get(`/workspaces/${w}/crm/deals/${dealId}/milestones`).then(r => r.data),
    enabled: !!w && !!dealId,
  })
}

export function useCreateMilestone(w: string | undefined, dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post(`/workspaces/${w}/crm/deals/${dealId}/milestones`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w, dealId)] }) },
  })
}

export function useUpdateMilestone(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/workspaces/${w}/crm/milestones/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', w, 'deals'] }) },
  })
}

export function useDeleteMilestone(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/crm/milestones/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', w, 'deals'] }) },
  })
}

export function useCompleteMilestone(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/workspaces/${w}/crm/milestones/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', w, 'deals'] }) },
  })
}

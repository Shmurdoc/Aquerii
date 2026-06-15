import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface WorkOrder {
  id: string
  workspace_id: string
  crm_deal_id: string
  work_order_number: string
  title: string
  description: string | null
  status: 'draft' | 'issued' | 'in_progress' | 'completed' | 'cancelled'
  scope_of_work: string | null
  location: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  actual_start: string | null
  actual_end: string | null
  assigned_worker_id: string | null
  total_hours_estimated: number | null
  total_hours_actual: number | null
  notes: string | null
  created_at: string
  updated_at: string
  deal?: { id: string; title: string }
  assigned_worker?: { id: string; name: string }
}

const wk = (w: string | undefined) => ['crm', w, 'work-orders']

export function useWorkOrders(w: string | undefined, params?: { status?: string; deal_id?: string }) {
  return useQuery<{ data: WorkOrder[] }>({
    queryKey: [...wk(w), params],
    queryFn: () => api.get(`/workspaces/${w}/crm/work-orders`, { params }).then(r => r.data),
    enabled: !!w,
  })
}

export function useWorkOrder(w: string | undefined, id: string | null) {
  return useQuery<{ data: WorkOrder }>({
    queryKey: [...wk(w), id],
    queryFn: () => api.get(`/workspaces/${w}/crm/work-orders/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateWorkOrder(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/crm/work-orders`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w)] }) },
  })
}

export function useUpdateWorkOrder(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`/workspaces/${w}/crm/work-orders/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), id] }); qc.invalidateQueries({ queryKey: [...wk(w)] }) },
  })
}

export function useDeleteWorkOrder(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/crm/work-orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w)] }) },
  })
}

export function useIssueWorkOrder(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/workspaces/${w}/crm/work-orders/${id}/issue`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w)] }) },
  })
}

export function useCompleteWorkOrder(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      api.post(`/workspaces/${w}/crm/work-orders/${id}/complete`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w)] }) },
  })
}

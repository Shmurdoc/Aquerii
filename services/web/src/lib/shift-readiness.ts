import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  return workspace.id
}

const base = (path: string) => `/workspaces/${wid()}/shift-readiness${path}`

export interface ShiftReadiness {
  date: string
  shift_type: string
  roles: ShiftRole[]
  overall_readiness: number
  critical_gaps: { role: string; gap: number }[]
}

export interface ShiftRole {
  role: string
  required: number
  assigned: number
  checked_in: number
  compliant: number
  gaps: number
}

export interface ShiftPlan {
  id: string
  date: string
  shift_type: string
  status: 'draft' | 'published' | 'completed'
  roles: ShiftRole[]
}

export function useShiftReadiness(workspaceId: string, date: string, shift: string) {
  return useQuery({
    queryKey: ['shift-readiness', workspaceId, date, shift],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/shift-readiness`, {
        params: { date, shift },
      })
      return res.data.data as ShiftReadiness
    },
    enabled: !!workspaceId && !!date && !!shift,
  })
}

export function useShiftPlans(workspaceId: string, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['shift-plans', workspaceId, dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/shift-plans`, {
        params: { date_from: dateFrom, date_to: dateTo },
      })
      return res.data.data as ShiftPlan[]
    },
    enabled: !!workspaceId && !!dateFrom && !!dateTo,
  })
}

export function useCreateShiftPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { date: string; shift_type: string }) => {
      const res = await api.post(`/workspaces/${wid()}/shift-plans`, payload)
      return res.data.data as ShiftPlan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['shift-plans'] })
    },
  })
}

export function useAssignWorker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { plan_id: string; role: string; worker_id: string }) => {
      const res = await api.post(`/workspaces/${wid()}/shift-plans/${payload.plan_id}/assign`, payload)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['shift-plans'] })
    },
  })
}

export function usePublishPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (planId: string) => {
      const res = await api.post(`/workspaces/${wid()}/shift-plans/${planId}/publish`)
      return res.data.data as ShiftPlan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['shift-plans'] })
    },
  })
}

export function useCompletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (planId: string) => {
      const res = await api.post(`/workspaces/${wid()}/shift-plans/${planId}/complete`)
      return res.data.data as ShiftPlan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['shift-plans'] })
    },
  })
}

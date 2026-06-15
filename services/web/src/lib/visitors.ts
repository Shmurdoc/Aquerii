import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  return workspace.id
}

export type VisitorType = 'supplier' | 'inspector' | 'guest' | 'job_applicant'

export interface VisitorSignInRequest {
  kiosk_id?: string
  visitor_type: VisitorType
  full_name: string
  company: string
  id_number?: string
  vehicle_reg?: string
  host_name: string
  host_contact?: string
  purpose: string
  notify_host: boolean
}

export interface VisitorLog {
  id: string
  workspace_id: string
  kiosk_id: string | null
  visitor_type: VisitorType
  full_name: string
  company: string
  id_number: string | null
  vehicle_reg: string | null
  host_name: string
  host_contact: string | null
  host_user_id: string | null
  host_notified: boolean
  host_notified_at: string | null
  purpose: string
  signed_in_at: string
  signed_out_at: string | null
  duration_minutes: number | null
  badge_printed: boolean
  badge_printed_at: string | null
}

export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  supplier: 'Supplier',
  inspector: 'Inspector (DMR)',
  guest: 'Guest',
  job_applicant: 'Job Applicant',
}

export const VISITOR_TYPE_ICONS: Record<VisitorType, string> = {
  supplier: '🚚',
  inspector: '📋',
  guest: '👤',
  job_applicant: '💼',
}

export function useActiveVisitor(kioskId?: string) {
  return useQuery({
    queryKey: ['visitor-active', wid(), kioskId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid()}/gate/visitors/active`)
      return res.data.data as VisitorLog | null
    },
  })
}

export function useSignInVisitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VisitorSignInRequest) => {
      const res = await api.post(`/workspaces/${wid()}/gate/visitors/sign-in`, payload)
      return res.data.data as VisitorLog
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitor-active', wid()] })
    },
  })
}

export function useSignOutVisitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (visitorId: string) => {
      const res = await api.post(`/workspaces/${wid()}/gate/visitors/${visitorId}/sign-out`)
      return res.data.data as VisitorLog
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitor-active', wid()] })
    },
  })
}

export function useMarkBadgePrinted() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (visitorId: string) => {
      const res = await api.post(`/workspaces/${wid()}/gate/visitors/${visitorId}/badge-printed`)
      return res.data.data as VisitorLog
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitor-active', wid()] })
    },
  })
}

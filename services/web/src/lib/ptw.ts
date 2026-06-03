/**
 * PTW API client — Permit to Work module.
 * Covers hot work, confined space, work at height, electrical isolation,
 * blasting, lifting, and excavation permits.
 *
 * Backed by the SA-mining compliant state machine in
 * App\Modules\PTW\Services\PermitWorkflowService.
 *
 * BACKEND ENVELOPE: { data: T[] } for indexes, { data: T } for show/store/update.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  return workspace.id
}

const base = (path: string) => `/workspaces/${wid()}/ptw${path}`

// ─── Types ──────────────────────────────────────────────────────────────────

export type PermitType =
  | 'hot_work' | 'confined_space' | 'work_at_height'
  | 'electrical_isolation' | 'blasting' | 'lifting' | 'excavation'

export type PermitStatus =
  | 'draft' | 'requested' | 'approved' | 'issued' | 'active'
  | 'suspended' | 'closed' | 'rejected' | 'expired'

export type PermitRiskLevel = 'low' | 'medium' | 'high' | 'extreme'

export type EnergyType =
  | 'electrical' | 'mechanical' | 'hydraulic' | 'pneumatic'
  | 'thermal' | 'chemical' | 'gravitational' | 'radioactive'

export type ResidualRisk = 'low' | 'medium' | 'high'

export type Transition =
  | 'request' | 'approve' | 'reject' | 'issue'
  | 'activate' | 'suspend' | 'resume' | 'close'

export const PERMIT_TYPES: PermitType[] = [
  'hot_work', 'confined_space', 'work_at_height',
  'electrical_isolation', 'blasting', 'lifting', 'excavation',
]

export const PERMIT_STATUSES: PermitStatus[] = [
  'draft', 'requested', 'approved', 'issued', 'active',
  'suspended', 'closed', 'rejected', 'expired',
]

export const PERMIT_RISK_LEVELS: PermitRiskLevel[] = ['low', 'medium', 'high', 'extreme']

export const ENERGY_TYPES: EnergyType[] = [
  'electrical', 'mechanical', 'hydraulic', 'pneumatic',
  'thermal', 'chemical', 'gravitational', 'radioactive',
]

export const TRANSITIONS: Transition[] = [
  'request', 'approve', 'reject', 'issue',
  'activate', 'suspend', 'resume', 'close',
]

export const HIGH_RISK_TYPES: PermitType[] = [
  'confined_space', 'electrical_isolation', 'blasting', 'lifting',
]

export const PERMIT_STATUS_COLORS: Record<PermitStatus, string> = {
  draft: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
  requested: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  approved: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  issued: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  suspended: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  closed: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/30',
  rejected: 'text-red-400 bg-red-500/10 border-red-500/30',
  expired: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
}

export const PERMIT_RISK_COLORS: Record<PermitRiskLevel, string> = {
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  extreme: 'text-red-400 bg-red-500/10 border-red-500/30',
}

export interface UserStub { id: string; name: string }

export interface PermitHazard {
  id: string
  description: string
  control_measure: string
  residual_risk: ResidualRisk
  verified: boolean
}

export interface PermitIsolation {
  id: string
  isolation_point: string
  energy_type: EnergyType
  method: string
  lock_number: string | null
  tag_number: string | null
  applied_at: string | null
  removed_at: string | null
}

export interface Permit {
  id: string
  workspace_id: string
  reference: string
  type: PermitType
  status: PermitStatus
  risk_level: PermitRiskLevel
  title: string
  description: string
  location: string
  location_details: Record<string, unknown> | null
  equipment_id: string | null
  issuer_id: string
  approver_id: string | null
  holder_id: string | null
  recipient_id: string | null
  valid_from: string | null
  valid_until: string | null
  max_extension_minutes: number
  extensions_used_minutes: number
  pre_conditions: string[] | null
  work_method_statement: string
  ppe_required: string
  requested_at: string | null
  approved_at: string | null
  issued_at: string | null
  activated_at: string | null
  suspended_at: string | null
  closed_at: string | null
  closed_by: string | null
  closure_notes: string | null
  rejection_reason: string | null
  suspension_reason: string | null
  created_at: string
  updated_at: string
  issuer?: UserStub
  approver?: UserStub
  holder?: UserStub
  recipient?: UserStub
  closer?: UserStub
  hazards?: PermitHazard[]
  isolations?: PermitIsolation[]
}

export interface DmrRegisterPermit {
  id: string
  reference: string
  type: PermitType
  is_high_risk: boolean
  status: PermitStatus
  risk_level: PermitRiskLevel
  title: string
  location: string | null
  issuer: UserStub | null
  approver: UserStub | null
  holder: UserStub | null
  recipient: UserStub | null
  issued_at: string | null
  activated_at: string | null
  closed_at: string | null
  closure_notes: string | null
  hazards: { description: string; control_measure: string; residual_risk: ResidualRisk; verified: boolean }[]
  isolations: { isolation_point: string; energy_type: EnergyType; method: string; lock_number: string | null; tag_number: string | null; applied_at: string | null; removed_at: string | null }[]
}

export interface DmrRegister {
  register: {
    authority: string
    regulation: string
    generated_at: string
    workspace_id: string
    period: { from: string | null; to: string | null }
    summary: {
      total: number
      by_type: Record<string, number>
      by_status: Record<string, number>
      high_risk_count: number
      active_count: number
      suspended_count: number
      closed_count: number
    }
    permits: DmrRegisterPermit[]
  }
}

export interface PermitDetail extends Permit {
  hazards: PermitHazard[]
  isolations: PermitIsolation[]
}

export interface PermitPayload {
  type: PermitType
  title: string
  description: string
  location: string
  risk_level: PermitRiskLevel
  work_method_statement: string
  ppe_required: string
  equipment_id?: string | null
  pre_conditions?: string[]
  hazards?: { description: string; control_measure: string; residual_risk: ResidualRisk }[]
  isolations?: { isolation_point: string; energy_type: EnergyType; method: string; lock_number?: string; tag_number?: string }[]
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function usePermits(filters?: { status?: PermitStatus; type?: PermitType; risk_level?: PermitRiskLevel; active?: boolean }) {
  return useQuery({
    queryKey: ['ptw-permits', wid(), filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.type) params.set('type', filters.type)
      if (filters?.risk_level) params.set('risk_level', filters.risk_level)
      if (filters?.active) params.set('active', '1')
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await api.get(base(`/permits${qs}`))
      return res.data.data as Permit[]
    },
  })
}

export function usePermit(id: string | undefined) {
  return useQuery({
    queryKey: ['ptw-permit', wid(), id],
    queryFn: async () => {
      const res = await api.get(base(`/permits/${id}`))
      return { ...res.data.data, available_transitions: res.data.available_transitions } as PermitDetail & { available_transitions: Transition[] }
    },
    enabled: !!id,
  })
}

export function useAvailableTransitions(id: string | undefined) {
  return useQuery({
    queryKey: ['ptw-permit-transitions', wid(), id],
    queryFn: async () => {
      const res = await api.get(base(`/permits/${id}/transitions`))
      return res.data.data as Transition[]
    },
    enabled: !!id,
  })
}

export function useCreatePermit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PermitPayload) => {
      const res = await api.post(base('/permits'), payload)
      return res.data.data as Permit
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ptw-permits', wid()] }),
  })
}

export function useUpdatePermit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PermitPayload> & { id: string }) => {
      const res = await api.patch(base(`/permits/${id}`), payload)
      return res.data.data as Permit
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ptw-permits', wid()] })
      qc.invalidateQueries({ queryKey: ['ptw-permit', wid(), vars.id] })
    },
  })
}

export function useDeletePermit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(base(`/permits/${id}`))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ptw-permits', wid()] }),
  })
}

export function usePermitTransition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action, payload }: { id: string; action: Transition; payload?: Record<string, unknown> }) => {
      const res = await api.post(base(`/permits/${id}/${action}`), payload ?? {})
      return res.data.data as Permit
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ptw-permits', wid()] })
      qc.invalidateQueries({ queryKey: ['ptw-permit', wid(), vars.id] })
      qc.invalidateQueries({ queryKey: ['ptw-permit-transitions', wid(), vars.id] })
    },
  })
}

export function useAddHazard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ permitId, payload }: { permitId: string; payload: { description: string; control_measure: string; residual_risk: ResidualRisk } }) => {
      const res = await api.post(base(`/permits/${permitId}/hazards`), payload)
      return res.data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ptw-permit', wid(), vars.permitId] })
    },
  })
}

export function useVerifyHazard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ permitId, hazardId }: { permitId: string; hazardId: string }) => {
      const res = await api.post(base(`/permits/${permitId}/hazards/${hazardId}/verify`))
      return res.data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ptw-permit', wid(), vars.permitId] })
    },
  })
}

export function useAddIsolation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ permitId, payload }: { permitId: string; payload: { isolation_point: string; energy_type: EnergyType; method: string; lock_number?: string; tag_number?: string } }) => {
      const res = await api.post(base(`/permits/${permitId}/isolations`), payload)
      return res.data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ptw-permit', wid(), vars.permitId] })
    },
  })
}

export function useDmrRegister(from?: string, to?: string) {
  return useQuery({
    queryKey: ['ptw-dmr-register', wid(), from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await api.get(base(`/register${qs}`))
      return res.data as DmrRegister
    },
  })
}

export function isHighRiskType(t: PermitType): boolean {
  return HIGH_RISK_TYPES.includes(t)
}

export function formatPermitType(t: PermitType): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatPermitStatus(s: PermitStatus): string {
  return s.replace(/_/g, ' ')
}

/**
 * HSSE API client — Health, Safety, Security, Environment module.
 * Covers Incidents, Hazards, and Corrective Actions.
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

const base = (path: string) => `/workspaces/${wid()}/hsse${path}`

// ─── Types ──────────────────────────────────────────────────────────────────

export type IncidentType =
  | 'fatality'
  | 'lost_time'
  | 'medical_treatment'
  | 'first_aid'
  | 'property_damage'
  | 'environmental'
  | 'near_miss'
  | 'other'

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational'

export type IncidentStatus = 'open' | 'under_investigation' | 'closed' | 'archived'

export const INCIDENT_TYPES: IncidentType[] = [
  'fatality', 'lost_time', 'medical_treatment', 'first_aid',
  'property_damage', 'environmental', 'near_miss', 'other',
]

export const INCIDENT_SEVERITIES: IncidentSeverity[] = [
  'critical', 'high', 'medium', 'low', 'informational',
]

export const INCIDENT_STATUSES: IncidentStatus[] = [
  'open', 'under_investigation', 'closed', 'archived',
]

export interface Incident {
  id: string
  workspace_id: string
  reference: string
  title: string
  description: string
  type: IncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  occurred_at: string
  reported_at: string
  location: string | null
  location_details: Record<string, unknown> | null
  body_part_affected: string | null
  injury_type: string | null
  mhsa_classification: 'A' | 'B' | 'C' | null
  coida_reportable: boolean
  coida_reference: string | null
  reporter_id: string
  investigator_id: string | null
  root_cause: string | null
  immediate_cause: string | null
  contributing_factors: string[] | null
  closed_at: string | null
  created_at: string
  updated_at: string
  reporter?: { id: string; name: string }
  investigator?: { id: string; name: string }
}

export type HazardCategory =
  | 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'psychosocial'
  | 'environmental' | 'mechanical' | 'electrical' | 'other'

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme'

export type HazardStatus = 'identified' | 'assessed' | 'controlled' | 'monitored' | 'closed'

export const HAZARD_CATEGORIES: HazardCategory[] = [
  'physical', 'chemical', 'biological', 'ergonomic', 'psychosocial',
  'environmental', 'mechanical', 'electrical', 'other',
]

export const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'extreme']

export const HAZARD_STATUSES: HazardStatus[] = [
  'identified', 'assessed', 'controlled', 'monitored', 'closed',
]

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  extreme: 'text-red-400 bg-red-500/10 border-red-500/30',
}

export const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  informational: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
}

export interface Hazard {
  id: string
  workspace_id: string
  reference: string
  title: string
  description: string
  category: HazardCategory
  location: string | null
  source: string | null
  potential_consequence: string | null
  likelihood: number
  severity: number
  risk_score: number
  risk_level: RiskLevel
  control_measures: string[] | null
  residual_likelihood: number | null
  residual_severity: number | null
  residual_risk_score: number | null
  residual_risk_level: RiskLevel | null
  status: HazardStatus
  owner_id: string
  reviewer_id: string | null
  next_review_date: string | null
  created_at: string
  updated_at: string
  owner?: { id: string; name: string }
  reviewer?: { id: string; name: string }
}

export type ActionSourceType = 'incident' | 'hazard' | 'inspection' | 'audit' | 'observation' | 'other'

export type ActionPriority = 'low' | 'medium' | 'high' | 'urgent'

export type ActionStatus = 'open' | 'in_progress' | 'completed' | 'verified' | 'overdue' | 'cancelled'

export const ACTION_SOURCE_TYPES: ActionSourceType[] = [
  'incident', 'hazard', 'inspection', 'audit', 'observation', 'other',
]

export const ACTION_PRIORITIES: ActionPriority[] = ['low', 'medium', 'high', 'urgent']

export const ACTION_STATUSES: ActionStatus[] = [
  'open', 'in_progress', 'completed', 'verified', 'overdue', 'cancelled',
]

export const PRIORITY_COLORS: Record<ActionPriority, string> = {
  low: 'text-zinc-400',
  medium: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
}

export const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  open: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  verified: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  overdue: 'text-red-400 bg-red-500/10 border-red-500/30',
  cancelled: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
}

export interface CorrectiveAction {
  id: string
  workspace_id: string
  reference: string
  source_type: ActionSourceType
  source_id: string | null
  description: string
  assigned_to: string
  priority: ActionPriority
  status: ActionStatus
  due_date: string | null
  completed_at: string | null
  verified_at: string | null
  verified_by: string | null
  completion_evidence: string | null
  created_at: string
  updated_at: string
  assignee?: { id: string; name: string }
  verifier?: { id: string; name: string }
}

export interface DashboardStats {
  period_days: number
  incidents: {
    total: number
    open: number
    investigating: number
    closed: number
    in_period: number
    by_severity: Record<string, number>
    by_type: Record<string, number>
    coida_reportable: number
    fatalities: number
  }
  hazards: {
    total: number
    open: number
    by_risk_level: Record<string, number>
    extreme_risk: number
  }
  generated_at: string
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useDashboard(days = 30) {
  return useQuery({
    queryKey: ['hsse-dashboard', wid(), days],
    queryFn: async () => {
      const res = await api.get(base(`/dashboard?days=${days}`))
      return res.data.data as DashboardStats
    },
  })
}

export function useIncidents(filters?: { status?: IncidentStatus; type?: IncidentType; severity?: IncidentSeverity }) {
  return useQuery({
    queryKey: ['hsse-incidents', wid(), filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.type) params.set('type', filters.type)
      if (filters?.severity) params.set('severity', filters.severity)
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await api.get(base(`/incidents${qs}`))
      return res.data.data as Incident[]
    },
  })
}

export function useIncident(id: string | undefined) {
  return useQuery({
    queryKey: ['hsse-incident', wid(), id],
    queryFn: async () => {
      const res = await api.get(base(`/incidents/${id}`))
      return res.data.data as Incident
    },
    enabled: !!id,
  })
}

export function useCreateIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Incident>) => {
      const res = await api.post(base('/incidents'), payload)
      return res.data.data as Incident
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hsse-incidents', wid()] }),
  })
}

export function useUpdateIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Incident> & { id: string }) => {
      const res = await api.patch(base(`/incidents/${id}`), payload)
      return res.data.data as Incident
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['hsse-incidents', wid()] })
      qc.invalidateQueries({ queryKey: ['hsse-incident', wid(), vars.id] })
      qc.invalidateQueries({ queryKey: ['hsse-dashboard', wid()] })
    },
  })
}

export function useHazards(filters?: { status?: HazardStatus; category?: HazardCategory; risk_level?: RiskLevel }) {
  return useQuery({
    queryKey: ['hsse-hazards', wid(), filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.category) params.set('category', filters.category)
      if (filters?.risk_level) params.set('risk_level', filters.risk_level)
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await api.get(base(`/hazards${qs}`))
      return res.data.data as Hazard[]
    },
  })
}

export function useCreateHazard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Hazard>) => {
      const res = await api.post(base('/hazards'), payload)
      return res.data.data as Hazard
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hsse-hazards', wid()] }),
  })
}

export function useUpdateHazard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Hazard> & { id: string }) => {
      const res = await api.patch(base(`/hazards/${id}`), payload)
      return res.data.data as Hazard
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['hsse-hazards', wid()] })
      qc.invalidateQueries({ queryKey: ['hsse-dashboard', wid()] })
    },
  })
}

export function useActions(filters?: { status?: ActionStatus; priority?: ActionPriority; source_type?: ActionSourceType; overdue?: boolean }) {
  return useQuery({
    queryKey: ['hsse-actions', wid(), filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.priority) params.set('priority', filters.priority)
      if (filters?.source_type) params.set('source_type', filters.source_type)
      if (filters?.overdue) params.set('overdue', '1')
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await api.get(base(`/corrective-actions${qs}`))
      return res.data.data as CorrectiveAction[]
    },
  })
}

export function useCreateAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<CorrectiveAction>) => {
      const res = await api.post(base('/corrective-actions'), payload)
      return res.data.data as CorrectiveAction
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hsse-actions', wid()] }),
  })
}

export function useUpdateAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CorrectiveAction> & { id: string }) => {
      const res = await api.patch(base(`/corrective-actions/${id}`), payload)
      return res.data.data as CorrectiveAction
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hsse-actions', wid()] }),
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function computeRiskScore(likelihood: number, severity: number): number {
  return likelihood * severity
}

export function computeRiskLevel(score: number): RiskLevel {
  if (score <= 4) return 'low'
  if (score <= 9) return 'medium'
  if (score <= 16) return 'high'
  return 'extreme'
}

export function formatIncidentType(t: IncidentType): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  return workspace.id
}

const base = (path: string) => `/workspaces/${wid()}/compliance${path}`

export type ComplianceStatus = 'compliant' | 'expiring' | 'non_compliant' | 'unknown'

export interface DashboardSummary {
  total_workers: number
  compliant: number
  expiring_soon: number
  non_compliant: number
  compliance_pct: number
  generated_at: string
}

export interface WorkerCompliance {
  id: string
  name: string
  badge_id: string | null
  role: string | null
  overall_status: ComplianceStatus
  avatar_url?: string | null
  certifications: WorkerCertification[]
}

export interface WorkerCertification {
  id: string
  name: string
  status: 'valid' | 'expiring_soon' | 'expired' | 'missing'
  issued_at: string | null
  expires_at: string | null
}

export interface ComplianceDashboardData {
  summary: DashboardSummary
  distribution: Record<ComplianceStatus, number>
  workers: WorkerCompliance[]
}

export function useComplianceDashboard() {
  return useQuery({
    queryKey: ['compliance-dashboard', wid()],
    queryFn: async () => {
      const res = await api.get(base('/dashboard'))
      return res.data.data as ComplianceDashboardData
    },
  })
}

export function useComplianceWorkers() {
  return useQuery({
    queryKey: ['compliance-workers', wid()],
    queryFn: async () => {
      const res = await api.get(base(''))
      return res.data.data as WorkerCompliance[]
    },
  })
}

export const COMPLIANCE_STATUS_COLORS: Record<ComplianceStatus, string> = {
  compliant: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  expiring: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  non_compliant: 'text-red-400 bg-red-500/10 border-red-500/30',
  unknown: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
}

export function formatComplianceStatus(s: ComplianceStatus): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

import axios from 'axios'

export interface PortalContractor {
  id: string
  company_name: string
  total_workers: number
  compliant_workers: number
  compliance_rate: number
  total_equipment: number
  compliant_equipment: number
  equipment_compliance_rate: number
  expiring_certs_count: number
}

export interface PortalSummary {
  workspace_name: string
  workspace_logo_url: string | null
  generated_at: string
  total_contractors: number
  total_workers: number
  overall_compliance_rate: number
  equipment_compliance_rate: number
  contractors: PortalContractor[]
}

export interface WorkerCertification {
  id: string
  name: string
  status: string
  expires_at: string | null
}

export interface PortalWorker {
  id: string
  name: string
  badge_id: string | null
  role: string | null
  overall_status: string
  certifications: WorkerCertification[]
}

export interface HeatmapCell {
  cert_name: string
  status: 'current' | 'expiring' | 'expired'
  count: number
}

export interface HeatmapRow {
  contractor_id: string
  contractor_name: string
  cells: HeatmapCell[]
}

export interface PortalHeatmap {
  cert_types: string[]
  rows: HeatmapRow[]
}

export class PortalTokenError extends Error {
  expired: boolean
  expiredAt: string | null

  constructor(message: string, expired: boolean, expiredAt?: string) {
    super(message)
    this.name = 'PortalTokenError'
    this.expired = expired
    this.expiredAt = expiredAt ?? null
  }
}

const portalClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

function portalPath(token: string, path: string): string {
  return `/portal/${token}${path}`
}

export async function fetchPortalSummary(token: string): Promise<PortalSummary> {
  try {
    const res = await portalClient.get(portalPath(token, '/summary'))
    return res.data.data as PortalSummary
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: { message?: string; data?: { expired_at?: string }; expired_at?: string } } }
    const status = axiosErr?.response?.status
    const body = axiosErr?.response?.data
    if (status === 410) {
      const expiredAt = body?.data?.expired_at ?? body?.expired_at
      throw new PortalTokenError(
        body?.message ?? 'This portal link has expired.',
        true,
        expiredAt,
      )
    }
    if (status === 404 || status === 403 || status === 401) {
      throw new PortalTokenError(
        body?.message ?? 'This portal link is invalid.',
        false,
      )
    }
    throw err
  }
}

export async function fetchContractorWorkers(token: string, contractorId: string): Promise<PortalWorker[]> {
  const res = await portalClient.get(portalPath(token, `/contractors/${contractorId}/workers`))
  return res.data.data as PortalWorker[]
}

export async function fetchPortalHeatmap(token: string): Promise<PortalHeatmap> {
  const res = await portalClient.get(portalPath(token, '/heatmap'))
  return res.data.data as PortalHeatmap
}

export async function downloadPortalPdf(token: string): Promise<Blob> {
  const res = await portalClient.get(portalPath(token, '/export'), { responseType: 'blob' })
  return res.data as Blob
}

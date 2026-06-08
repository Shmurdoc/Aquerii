import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  return workspace.id
}

const base = (path: string) => `/workspaces/${wid()}/equipment${path}`

export type EquipmentStatus = 'active' | 'inactive' | 'out_of_service' | 'retired'

export type EquipmentComplianceStatus = 'compliant' | 'expiring_soon' | 'non_compliant' | 'suspended'

export interface Equipment {
  id: string
  name: string
  equipment_type: string
  registration_number: string
  status: EquipmentStatus
  compliance_status: EquipmentComplianceStatus
  manufacturer: string | null
  model: string | null
  year: number | null
  site_area: string | null
  created_at: string
  updated_at: string
}

export interface EquipmentFilters {
  page?: number
  per_page?: number
  search?: string
  type?: string
  status?: EquipmentStatus
  compliance_status?: EquipmentComplianceStatus
}

export interface EquipmentListResponse {
  data: Equipment[]
  current_page: number
  last_page: number
  total: number
}

export interface EquipmentCertType {
  id: string
  name: string
  description: string | null
  required: boolean
}

export interface EquipmentCertRecord {
  id: string
  equipment_id: string
  cert_type_id: string
  cert_type_name: string
  cert_number: string
  issued_at: string | null
  expires_at: string | null
  status: 'valid' | 'expiring_soon' | 'expired' | 'missing'
  verified: boolean
  verified_at: string | null
  verified_by: string | null
  file_url: string | null
  notes: string | null
}

export interface EquipmentComplianceBreakdown {
  equipment_id: string
  overall_status: EquipmentComplianceStatus
  cert_summary: {
    valid: number
    expiring_soon: number
    expired: number
    missing: number
    total: number
  }
  breakdown: Array<{
    cert_type_id: string
    cert_type_name: string
    status: 'valid' | 'expiring_soon' | 'expired' | 'missing'
    cert_id: string | null
    issued_at: string | null
    expires_at: string | null
  }>
}

export interface EquipmentScanResult {
  status: 'compliant' | 'non_compliant'
  equipment: {
    id: string
    name: string
    registration_number: string
    equipment_type: string
  } | null
  non_compliance_reasons: string[]
  scanned_at: string
}

export function useEquipmentList(filters: EquipmentFilters = {}) {
  return useQuery({
    queryKey: ['equipment-list', wid(), filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.page) params.set('page', String(filters.page))
      if (filters.per_page) params.set('per_page', String(filters.per_page))
      if (filters.search) params.set('search', filters.search)
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.compliance_status) params.set('compliance_status', filters.compliance_status)
      const res = await api.get(base(''), { params })
      return res.data as EquipmentListResponse
    },
  })
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: ['equipment', wid(), id],
    queryFn: async () => {
      const res = await api.get(base(`/${id}`))
      return res.data.data as Equipment
    },
    enabled: !!id,
  })
}

export function useEquipmentCompliance(id: string) {
  return useQuery({
    queryKey: ['equipment-compliance', wid(), id],
    queryFn: async () => {
      const res = await api.get(base(`/${id}/compliance`))
      return res.data.data as EquipmentComplianceBreakdown
    },
    enabled: !!id,
  })
}

export function useEquipmentCertTypes() {
  return useQuery({
    queryKey: ['equipment-cert-types', wid()],
    queryFn: async () => {
      const res = await api.get(base('/cert-types'))
      return res.data.data as EquipmentCertType[]
    },
  })
}

export function useEquipmentCertRecords(equipmentId: string) {
  return useQuery({
    queryKey: ['equipment-cert-records', wid(), equipmentId],
    queryFn: async () => {
      const res = await api.get(base(`/${equipmentId}/certs`))
      return res.data.data as EquipmentCertRecord[]
    },
    enabled: !!equipmentId,
  })
}

export function useCreateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Equipment>) => {
      const res = await api.post(base(''), payload)
      return res.data.data as Equipment
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-list', wid()] })
    },
  })
}

export function useUpdateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Equipment> & { id: string }) => {
      const res = await api.put(base(`/${id}`), payload)
      return res.data.data as Equipment
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['equipment-list', wid()] })
      qc.invalidateQueries({ queryKey: ['equipment', wid(), vars.id] })
    },
  })
}

export function useDeleteEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(base(`/${id}`))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-list', wid()] })
    },
  })
}

export function useCreateCertRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ equipmentId, ...payload }: { equipmentId: string } & Record<string, unknown>) => {
      const res = await api.post(base(`/${equipmentId}/certs`), payload)
      return res.data.data as EquipmentCertRecord
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['equipment-cert-records', wid(), vars.equipmentId] })
      qc.invalidateQueries({ queryKey: ['equipment-compliance', wid(), vars.equipmentId] })
    },
  })
}

export function useVerifyCertRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ equipmentId, certId }: { equipmentId: string; certId: string }) => {
      const res = await api.put(base(`/${equipmentId}/certs/${certId}/verify`))
      return res.data.data as EquipmentCertRecord
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['equipment-cert-records', wid(), vars.equipmentId] })
      qc.invalidateQueries({ queryKey: ['equipment-compliance', wid(), vars.equipmentId] })
    },
  })
}

export function useCreateEquipmentCertRecord() {
  return useCreateCertRecord()
}

export function useEquipmentSummary() {
  return useQuery({
    queryKey: ['equipment-summary', wid()],
    queryFn: async () => {
      const res = await api.get(base('/summary'))
      return res.data.data as {
        total: number
        compliant: number
        non_compliant: number
        expiring_soon: number
        suspended: number
      }
    },
  })
}

export function scanEquipment(registrationNumber: string) {
  return api.post(`/workspaces/${wid()}/gate/scan-equipment`, {
    registration_number: registrationNumber,
  })
}

export const EQUIPMENT_COMPLIANCE_STYLES: Record<EquipmentComplianceStatus, string> = {
  compliant: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  expiring_soon: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  non_compliant: 'text-red-400 bg-red-500/10 border-red-500/30',
  suspended: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
}

export const EQUIPMENT_STATUS_STYLES: Record<EquipmentStatus, string> = {
  active: 'text-emerald-400 bg-emerald-500/10',
  inactive: 'text-zinc-400 bg-zinc-500/10',
  out_of_service: 'text-red-400 bg-red-500/10',
  retired: 'text-zinc-500 bg-zinc-600/10',
}

export function formatEquipmentComplianceStatus(s: EquipmentComplianceStatus): string {
  switch (s) {
    case 'expiring_soon': return 'Expiring Soon'
    case 'non_compliant': return 'Non-Compliant'
    default: return s.charAt(0).toUpperCase() + s.slice(1)
  }
}

export function formatEquipmentStatus(s: EquipmentStatus): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

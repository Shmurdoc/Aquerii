import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface CrmContact {
  id: string
  workspace_id: string
  name: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  social_links: Record<string, string> | null
  lifecycle_stage: string
  consent_gdpr: boolean
  consent_marketing: boolean
  consent_preferences: Record<string, boolean> | null
  last_touched_at: string | null
  source: string
  source_url: string | null
  avatar_url: string | null
  city: string | null
  country: string | null
  owner_id: string | null
  company_id: string | null
  tags: string[] | null
  lead_score: number | null
  custom_fields: Record<string, unknown> | null
  notes: string | null
  company?: { id: string; name: string } | null
  deals?: CrmDeal[]
  relationships?: CrmContactRelationship[]
  stage_history?: CrmStageTransition[]
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  title: string
  value: number | null
  currency: string
  stage_id: string
  pipeline_id: string
  ai_score: number | null
  contact?: { id: string; full_name: string } | null
  created_at: string
  updated_at: string
}

export interface CrmDeal {
  id: string
  title: string
  value: number | null
  currency: string
  stage_id: string
  pipeline_id: string
  ai_score: number | null
  stage?: { name: string; color: string | null }
  contact?: { id: string; full_name: string } | null
}

export interface CrmLead {
  id: string
  workspace_id: string
  contact_id: string | null
  email: string | null
  phone: string | null
  first_name: string
  last_name: string
  company_name: string | null
  source: string
  source_url: string | null
  score: number
  status: string
  assigned_to: string | null
  notes: string | null
  custom_fields: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface CrmCompany {
  id: string
  workspace_id: string
  name: string
  domain: string | null
  industry: string | null
  size: string | null
  website: string | null
  notes: string | null
  custom_fields: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface CrmContactRelationship {
  id: string
  contact_id: string
  related_contact_id: string
  relationship_type: string
  related_contact?: { id: string; name: string; email: string | null }
}

export interface CrmStageTransition {
  id: string
  contact_id: string
  from_stage: string | null
  to_stage: string
  reason: string | null
  changed_by: string | null
  created_at: string
}

export interface ContactImportStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_rows: number
  processed_rows: number
  failed_rows: number
  errors: string[] | null
}

export interface Pipeline {
  id: string
  name: string
  is_default: boolean
  stages: Stage[]
}

export interface Stage {
  id: string
  name: string
  color: string | null
  position: number
  win_probability: number
}

export function selectPipeline(pipelines: Pipeline[], pipelineId: string | null): Pipeline | undefined {
  return pipelines.find(p => p.id === pipelineId) ?? pipelines.find(p => p.is_default) ?? pipelines[0]
}

export function dealsByStage(deals: Deal[], stageId: string): Deal[] {
  return deals.filter(d => d.stage_id === stageId)
}

export function stageValue(deals: Deal[], stageId: string): number {
  return dealsByStage(deals, stageId).reduce((sum, d) => sum + (d.value ?? 0), 0)
}

export function scoreColor(s: number): string {
  if (s >= 70) return 'text-green-400'
  if (s >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

export function lifecycleColor(stage: string): string {
  switch (stage) {
    case 'lead': return 'text-blue-400 bg-blue-500/10'
    case 'qualified': return 'text-indigo-400 bg-indigo-500/10'
    case 'opportunity': return 'text-purple-400 bg-purple-500/10'
    case 'customer': return 'text-green-400 bg-green-500/10'
    case 'churned': return 'text-red-400 bg-red-500/10'
    default: return 'text-gray-400 bg-gray-500/10'
  }
}

const wk = (w: string | undefined) => ['crm', w]

export function useContacts(w: string | undefined, search = '') {
  return useQuery<{ data: CrmContact[] }>({
    queryKey: [...wk(w), 'contacts', search],
    queryFn: () => api.get(`/workspaces/${w}/crm/contacts`, { params: search ? { search } : {} }).then(r => r.data),
    enabled: !!w,
  })
}

export function useContact(w: string | undefined, id: string | null) {
  return useQuery<{ data: CrmContact }>({
    queryKey: [...wk(w), 'contact', id],
    queryFn: () => api.get(`/workspaces/${w}/crm/contacts/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateContact(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/crm/contacts`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'contacts'] }) },
  })
}

export function useUpdateContact(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/crm/contacts/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'contact', id] }); qc.invalidateQueries({ queryKey: [...wk(w), 'contacts'] }) },
  })
}

export function useDeleteContact(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/workspaces/${w}/crm/contacts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'contacts'] }) },
  })
}

export function useTransitionContact(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { to_stage: string; reason?: string }) => api.post(`/workspaces/${w}/crm/contacts/${id}/transition`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'contact', id] }); qc.invalidateQueries({ queryKey: [...wk(w), 'contacts'] }) },
  })
}

export function useDuplicateContacts(w: string | undefined, id: string) {
  return useQuery<{ data: CrmContact[] }>({
    queryKey: [...wk(w), 'contact', id, 'duplicates'],
    queryFn: () => api.get(`/workspaces/${w}/crm/contacts/${id}/duplicates`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useMergeContacts(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { source_id: string; target_id: string }) => api.post(`/workspaces/${w}/crm/contacts/${data.target_id}/merge`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'contacts'] }) },
  })
}

export function useTouchContact(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/workspaces/${w}/crm/contacts/${id}/touch`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'contact', id] }) },
  })
}

export function useAddRelationship(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { contact_id: string; related_contact_id: string; relationship_type: string }) =>
      api.post(`/workspaces/${w}/crm/contacts/${data.contact_id}/relationships`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'contact'] }) },
  })
}

export function useRemoveRelationship(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { contact_id: string; relationship_id: string }) =>
      api.delete(`/workspaces/${w}/crm/contacts/${data.contact_id}/relationships/${data.relationship_id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'contact'] }) },
  })
}

export function useConsent(w: string | undefined, id: string | null) {
  return useQuery<{ data: { consent_gdpr: boolean; consent_marketing: boolean; consent_preferences: Record<string, boolean> | null } }>({
    queryKey: [...wk(w), 'contact', id, 'consent'],
    queryFn: () => api.get(`/workspaces/${w}/crm/contacts/${id}/consent`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useUpdateConsent(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { consent_gdpr?: boolean; consent_marketing?: boolean; consent_preferences?: Record<string, boolean> }) =>
      api.patch(`/workspaces/${w}/crm/contacts/${id}/consent`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'contact', id, 'consent'] }) },
  })
}

export function useExportConsent(w: string | undefined, id: string) {
  return useMutation({
    mutationFn: () => api.post(`/workspaces/${w}/crm/contacts/${id}/consent/export`, {}, { responseType: 'blob' }),
  })
}

export function useImportContacts(w: string | undefined) {
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post(`/workspaces/${w}/crm/contacts/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  })
}

export function useImportStatus(w: string | undefined, importId: string | null) {
  return useQuery<{ data: ContactImportStatus }>({
    queryKey: [...wk(w), 'import', importId],
    queryFn: () => api.get(`/workspaces/${w}/crm/contacts/import/${importId}/status`).then(r => r.data),
    enabled: !!w && !!importId,
    refetchInterval: (q) => q.state.data?.data?.status === 'processing' ? 2000 : false,
  })
}

export function useLeads(w: string | undefined) {
  return useQuery<{ data: CrmLead[] }>({
    queryKey: [...wk(w), 'leads'],
    queryFn: () => api.get(`/workspaces/${w}/crm/leads`).then(r => r.data),
    enabled: !!w,
  })
}

export function useLead(w: string | undefined, id: string | null) {
  return useQuery<{ data: CrmLead }>({
    queryKey: [...wk(w), 'lead', id],
    queryFn: () => api.get(`/workspaces/${w}/crm/leads/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateLead(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/crm/leads`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'leads'] }) },
  })
}

export function useUpdateLead(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/crm/leads/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'leads'] }) },
  })
}

export function useDeleteLead(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/workspaces/${w}/crm/leads/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'leads'] }) },
  })
}

export function useAssignLead(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { assigned_to: string }) => api.post(`/workspaces/${w}/crm/leads/${id}/assign`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'leads'] }) },
  })
}

export function useConvertLead(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { pipeline_id?: string; stage_id?: string; deal_title?: string; deal_value?: number }) =>
      api.post(`/workspaces/${w}/crm/leads/${id}/convert`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'leads'] }); qc.invalidateQueries({ queryKey: [...wk(w), 'contacts'] }); qc.invalidateQueries({ queryKey: [...wk(w), 'deals'] }) },
  })
}

export function validateContactForm(firstName: string, lastName: string): string | null {
  if (!firstName.trim() || !lastName.trim()) return 'First and last name are required.'
  return null
}

// ─── Phase 2: Types ──────────────────────────────────────────────────────────

export interface CrmForecast {
  total_pipeline: number
  weighted_forecast: number
  best_case: number
  commit: number
  closed_won: number
  by_rep: { rep_id: string; rep_name: string; amount: number; weighted: number }[]
  by_pipeline: { pipeline_id: string; pipeline_name: string; amount: number; weighted: number }[]
}

export interface CrmQuota {
  id: string
  workspace_id: string
  user_id: string
  period: string
  target_amount: number
  currency: string
  pipeline_id: string | null
  attainment: number | null
  user?: { id: string; name: string; email: string }
  pipeline?: { id: string; name: string }
  created_at: string
  updated_at: string
}

export interface CrmSequence {
  id: string
  workspace_id: string
  name: string
  description: string | null
  steps: CrmSequenceStep[]
  type: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CrmSequenceStep {
  id?: string
  type: string
  subject: string
  content: string
  delay_hours: number
  order: number
}

export interface CrmSequenceEnrollment {
  id: string
  sequence_id: string
  contact_id: string
  status: string
  current_step: number
  contact?: { id: string; name: string; email: string | null }
  created_at: string
  updated_at: string
}

export interface CrmCallLog {
  id: string
  workspace_id: string
  contact_id: string | null
  deal_id: string | null
  direction: string
  duration_seconds: number | null
  outcome: string | null
  notes: string | null
  contact?: { id: string; name: string; email: string | null }
  deal?: { id: string; title: string }
  created_at: string
  updated_at: string
}

// ─── Phase 2: Hooks ──────────────────────────────────────────────────────────

export function useForecast(w: string | undefined) {
  return useQuery<{ data: CrmForecast }>({
    queryKey: [...wk(w), 'forecast'],
    queryFn: () => api.get(`/workspaces/${w}/crm/forecast`).then(r => r.data),
    enabled: !!w,
  })
}

export function useForecastByRep(w: string | undefined) {
  return useQuery<{ data: { rep_id: string; rep_name: string; amount: number; weighted: number }[] }>({
    queryKey: [...wk(w), 'forecast', 'by-rep'],
    queryFn: () => api.get(`/workspaces/${w}/crm/forecast/by-rep`).then(r => r.data),
    enabled: !!w,
  })
}

export function useForecastByPipeline(w: string | undefined) {
  return useQuery<{ data: { pipeline_id: string; pipeline_name: string; amount: number; weighted: number }[] }>({
    queryKey: [...wk(w), 'forecast', 'by-pipeline'],
    queryFn: () => api.get(`/workspaces/${w}/crm/forecast/by-pipeline`).then(r => r.data),
    enabled: !!w,
  })
}

export function useQuotas(w: string | undefined) {
  return useQuery<{ data: CrmQuota[] }>({
    queryKey: [...wk(w), 'quotas'],
    queryFn: () => api.get(`/workspaces/${w}/crm/quotas`).then(r => r.data),
    enabled: !!w,
  })
}

export function useQuota(w: string | undefined, id: string | null) {
  return useQuery<{ data: CrmQuota }>({
    queryKey: [...wk(w), 'quota', id],
    queryFn: () => api.get(`/workspaces/${w}/crm/quotas/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateQuota(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/crm/quotas`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'quotas'] }) },
  })
}

export function useUpdateQuota(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/crm/quotas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'quotas'] }) },
  })
}

export function useDeleteQuota(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/crm/quotas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'quotas'] }) },
  })
}

export function useQuotaAttainment(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/workspaces/${w}/crm/quotas/${id}/attainment`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'quotas'] }) },
  })
}

export function useSequences(w: string | undefined) {
  return useQuery<{ data: CrmSequence[] }>({
    queryKey: [...wk(w), 'sequences'],
    queryFn: () => api.get(`/workspaces/${w}/crm/sequences`).then(r => r.data),
    enabled: !!w,
  })
}

export function useSequence(w: string | undefined, id: string | null) {
  return useQuery<{ data: CrmSequence }>({
    queryKey: [...wk(w), 'sequence', id],
    queryFn: () => api.get(`/workspaces/${w}/crm/sequences/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateSequence(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/crm/sequences`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'sequences'] }) },
  })
}

export function useUpdateSequence(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/crm/sequences/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'sequences'] }) },
  })
}

export function useDeleteSequence(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/crm/sequences/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'sequences'] }) },
  })
}

export function useEnrollSequence(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sequence_id, contact_id }: { sequence_id: string; contact_id: string }) =>
      api.post(`/workspaces/${w}/crm/sequences/${sequence_id}/enroll`, { contact_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'sequences'] }) },
  })
}

export function useUnenrollSequence(w: string | undefined, sequenceId: string, enrollmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/workspaces/${w}/crm/sequences/${sequenceId}/enrollments/${enrollmentId}/unenroll`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'sequence', sequenceId] }) },
  })
}

export function useSequenceProgress(w: string | undefined, id: string | null) {
  return useQuery<{ data: any }>({
    queryKey: [...wk(w), 'sequence', id, 'progress'],
    queryFn: () => api.get(`/workspaces/${w}/crm/sequences/${id}/progress`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCallLogs(w: string | undefined) {
  return useQuery<{ data: CrmCallLog[] }>({
    queryKey: [...wk(w), 'call-logs'],
    queryFn: () => api.get(`/workspaces/${w}/crm/call-logs`).then(r => r.data),
    enabled: !!w,
  })
}

export function useCreateCallLog(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/crm/call-logs`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'call-logs'] }) },
  })
}

export function useDeleteCallLog(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/workspaces/${w}/crm/call-logs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'call-logs'] }) },
  })
}

export function useMarkWon(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/workspaces/${w}/crm/deals/${id}/won`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'deals'] }); qc.invalidateQueries({ queryKey: ['crm-deals', w] }) },
  })
}

export function useMarkLost(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { loss_reason?: string; loss_details?: string }) => api.post(`/workspaces/${w}/crm/deals/${id}/lost`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'deals'] }); qc.invalidateQueries({ queryKey: ['crm-deals', w] }) },
  })
}

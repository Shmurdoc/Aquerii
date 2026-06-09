import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Campaign {
  id: string
  workspace_id: string
  name: string
  description: string | null
  type: string
  status: string
  channel: string | null
  budget: number | null
  actual_spend: number | null
  started_at: string | null
  ended_at: string | null
  target_audience: Record<string, unknown> | null
  goal: string | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
  sent_count: number
  opened_count: number
  clicked_count: number
  converted_count: number
  launched_by: string | null
  launchedBy?: { id: string; name: string } | null
  audience?: CampaignAudience[]
  created_at: string
}

export interface CampaignAudience {
  id: string
  campaign_id: string
  contact_id: string
  status: string
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  converted_at: string | null
  contact?: { id: string; name: string; email: string }
}

export interface EmailTemplate {
  id: string
  workspace_id: string
  name: string
  description: string | null
  subject: string
  content_html: string | null
  content_text: string | null
  tokens: string[] | null
  category: string | null
  is_shared: boolean
  createdBy?: { id: string; name: string }
  created_at: string
}

export interface Segment {
  id: string
  workspace_id: string
  name: string
  description: string | null
  criteria: Record<string, unknown>
  cached_count: number
  last_calculated_at: string | null
  is_dynamic: boolean
  tags: string[] | null
  createdBy?: { id: string; name: string }
  created_at: string
}

function wk(w: string | undefined) { return ['marketing', w] as const }

export function useCampaigns(w: string | undefined, params?: Record<string, string>) {
  return useQuery<{ data: Campaign[] }>({
    queryKey: [...wk(w), 'campaigns', params],
    queryFn: () => api.get(`/workspaces/${w}/marketing/campaigns`, { params }).then(r => r.data),
    enabled: !!w,
  })
}

export function useCampaign(w: string | undefined, id: string | null) {
  return useQuery<{ data: Campaign }>({
    queryKey: [...wk(w), 'campaign', id],
    queryFn: () => api.get(`/workspaces/${w}/marketing/campaigns/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateCampaign(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/marketing/campaigns`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'campaigns'] }) },
  })
}

export function useUpdateCampaign(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/marketing/campaigns/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'campaigns'] }) },
  })
}

export function useDeleteCampaign(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/marketing/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'campaigns'] }) },
  })
}

export function useLaunchCampaign(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contact_ids: string[]) => api.post(`/workspaces/${w}/marketing/campaigns/${id}/launch`, { contact_ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'campaigns'] }) },
  })
}

export function useCampaignStats(w: string | undefined, id: string | null) {
  return useQuery<{ data: { sent: number; opened: number; clicked: number; converted: number; budget: number | null; spend: number | null; roi: number | null } }>({
    queryKey: [...wk(w), 'campaign', id, 'stats'],
    queryFn: () => api.get(`/workspaces/${w}/marketing/campaigns/${id}/stats`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useEmailTemplates(w: string | undefined, params?: Record<string, string>) {
  return useQuery<{ data: EmailTemplate[] }>({
    queryKey: [...wk(w), 'templates', params],
    queryFn: () => api.get(`/workspaces/${w}/marketing/email-templates`, { params }).then(r => r.data),
    enabled: !!w,
  })
}

export function useEmailTemplate(w: string | undefined, id: string | null) {
  return useQuery<{ data: EmailTemplate }>({
    queryKey: [...wk(w), 'template', id],
    queryFn: () => api.get(`/workspaces/${w}/marketing/email-templates/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateEmailTemplate(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/marketing/email-templates`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'templates'] }) },
  })
}

export function useUpdateEmailTemplate(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/marketing/email-templates/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'templates'] }) },
  })
}

export function useDeleteEmailTemplate(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/marketing/email-templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'templates'] }) },
  })
}

export function useSegments(w: string | undefined) {
  return useQuery<{ data: Segment[] }>({
    queryKey: [...wk(w), 'segments'],
    queryFn: () => api.get(`/workspaces/${w}/marketing/segments`).then(r => r.data),
    enabled: !!w,
  })
}

export function useSegment(w: string | undefined, id: string | null) {
  return useQuery<{ data: Segment }>({
    queryKey: [...wk(w), 'segment', id],
    queryFn: () => api.get(`/workspaces/${w}/marketing/segments/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateSegment(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/marketing/segments`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'segments'] }) },
  })
}

export function useUpdateSegment(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/marketing/segments/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'segments'] }) },
  })
}

export function useDeleteSegment(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/marketing/segments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'segments'] }) },
  })
}

export function useCalculateSegment(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.get(`/workspaces/${w}/marketing/segments/${id}/count`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'segments'] }) },
  })
}

export function useSegmentPreview(w: string | undefined, id: string | null) {
  return useQuery<{ data: { id: string; first_name: string; last_name: string; email: string }[] }>({
    queryKey: [...wk(w), 'segment', id, 'preview'],
    queryFn: () => api.get(`/workspaces/${w}/marketing/segments/${id}/preview`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

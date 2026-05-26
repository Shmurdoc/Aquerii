import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Ticket {
  id: string
  workspace_id: string
  contact_id: string | null
  subject: string
  description: string | null
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'critical'
  assigned_to: string | null
  channel: string | null
  source: string | null
  tags: string[] | null
  custom_fields: Record<string, unknown> | null
  closed_at: string | null
  sla_due_at: string | null
  sla_breached_at: string | null
  first_response_at: string | null
  resolution_summary: string | null
  contact?: { id: string; name: string; email: string } | null
  assignee?: { id: string; name: string } | null
  slaPolicy?: { id: string; name: string } | null
  messages?: TicketMessage[]
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  user_id: string | null
  body: string
  is_internal: boolean
  channel: string | null
  attachments: Record<string, unknown>[] | null
  user?: { id: string; name: string }
  created_at: string
}

export interface TicketSla {
  id: string
  workspace_id: string
  name: string
  description: string | null
  priority: string
  first_response_hours: number
  resolution_hours: number
  escalation_user_id: string | null
  is_active: boolean
  created_at: string
}

export interface SlaBreach {
  id: string
  ticket_id: string
  sla_policy_id: string | null
  breach_type: string
  breached_at: string
  ticket?: { id: string; subject: string; status: string }
  slaPolicy?: { id: string; name: string }
}

export interface KnowledgeBaseArticle {
  id: string
  workspace_id: string
  title: string
  content: string
  category: string | null
  tags: string[] | null
  is_published: boolean
  views: number
  helpful_count: number
  not_helpful_count: number
  author_id?: string
  author?: { id: string; name: string }
  created_at: string
  updated_at: string
}

function wk(w: string | undefined) { return ['support', w] as const }

export function useTickets(w: string | undefined, params?: Record<string, string>) {
  return useQuery<{ data: Ticket[] }>({
    queryKey: [...wk(w), 'tickets', params],
    queryFn: () => api.get(`/workspaces/${w}/support/tickets`, { params }).then(r => r.data),
    enabled: !!w,
  })
}

export function useTicket(w: string | undefined, id: string | null) {
  return useQuery<{ data: Ticket }>({
    queryKey: [...wk(w), 'ticket', id],
    queryFn: () => api.get(`/workspaces/${w}/support/tickets/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateTicket(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/support/tickets`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'tickets'] }) },
  })
}

export function useUpdateTicket(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/support/tickets/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'ticket', id] }); qc.invalidateQueries({ queryKey: [...wk(w), 'tickets'] }) },
  })
}

export function useAssignTicket(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { assigned_to: string }) => api.post(`/workspaces/${w}/support/tickets/${id}/assign`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'ticket', id] }); qc.invalidateQueries({ queryKey: [...wk(w), 'tickets'] }) },
  })
}

export function useDeleteTicket(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/support/tickets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'tickets'] }) },
  })
}

export function useTicketMessages(w: string | undefined, ticketId: string | null) {
  return useQuery<{ data: TicketMessage[] }>({
    queryKey: [...wk(w), 'ticket', ticketId, 'messages'],
    queryFn: () => api.get(`/workspaces/${w}/support/tickets/${ticketId}/messages`).then(r => r.data),
    enabled: !!w && !!ticketId,
  })
}

export function useCreateTicketMessage(w: string | undefined, ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/support/tickets/${ticketId}/messages`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'ticket', ticketId, 'messages'] }) },
  })
}

export function useSlas(w: string | undefined) {
  return useQuery<{ data: TicketSla[] }>({
    queryKey: [...wk(w), 'slas'],
    queryFn: () => api.get(`/workspaces/${w}/support/slas`).then(r => r.data),
    enabled: !!w,
  })
}

export function useSla(w: string | undefined, id: string | null) {
  return useQuery<{ data: TicketSla }>({
    queryKey: [...wk(w), 'sla', id],
    queryFn: () => api.get(`/workspaces/${w}/support/slas/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateSla(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/support/slas`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'slas'] }) },
  })
}

export function useUpdateSla(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/support/slas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'slas'] }) },
  })
}

export function useDeleteSla(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/support/slas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'slas'] }) },
  })
}

export function useSlaBreaches(w: string | undefined) {
  return useQuery<{ data: SlaBreach[] }>({
    queryKey: [...wk(w), 'sla-breaches'],
    queryFn: () => api.get(`/workspaces/${w}/support/slas/breaches`).then(r => r.data),
    enabled: !!w,
  })
}

export function useSlaCompliance(w: string | undefined) {
  return useQuery<{ data: { total_tickets: number; breached: number; compliance_pct: number } }>({
    queryKey: [...wk(w), 'sla-compliance'],
    queryFn: () => api.get(`/workspaces/${w}/support/slas/compliance`).then(r => r.data),
    enabled: !!w,
  })
}

export function useKnowledgeBase(w: string | undefined, params?: Record<string, string>) {
  return useQuery<{ data: KnowledgeBaseArticle[] }>({
    queryKey: [...wk(w), 'kb', params],
    queryFn: () => api.get(`/workspaces/${w}/support/knowledge-base`, { params }).then(r => r.data),
    enabled: !!w,
  })
}

export function useKnowledgeBaseArticle(w: string | undefined, id: string | null) {
  return useQuery<{ data: KnowledgeBaseArticle }>({
    queryKey: [...wk(w), 'kb', id],
    queryFn: () => api.get(`/workspaces/${w}/support/knowledge-base/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateKbArticle(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/support/knowledge-base`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'kb'] }) },
  })
}

export function useUpdateKbArticle(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/workspaces/${w}/support/knowledge-base/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'kb'] }) },
  })
}

export function useDeleteKbArticle(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${w}/support/knowledge-base/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'kb'] }) },
  })
}

export function useVoteKbArticle(w: string | undefined, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (helpful: boolean) => api.post(`/workspaces/${w}/support/knowledge-base/${id}/vote`, { helpful }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'kb', id] }) },
  })
}

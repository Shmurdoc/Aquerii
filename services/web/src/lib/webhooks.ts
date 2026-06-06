import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  return useAuthStore.getState().workspace!.id
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string
  workspace_id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  created_by: string
  last_triggered_at: string | null
  last_response_status: number | null
  created_at: string
  updated_at: string
  secret?: string
}

export interface WebhookDelivery {
  id: string
  webhook_endpoint_id: string
  event: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  attempt: number
  delivered_at: string | null
  failed_at: string | null
  created_at: string
  updated_at: string
}

export interface WebhookEndpointInput {
  name: string
  url: string
  events: string[]
  is_active?: boolean
}

// ─── API client ──────────────────────────────────────────────────────────────

export async function listWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  const res = await api.get(`/workspaces/${wid()}/webhook-endpoints`)
  return res.data.data
}

export async function createWebhookEndpoint(input: WebhookEndpointInput): Promise<WebhookEndpoint> {
  const res = await api.post(`/workspaces/${wid()}/webhook-endpoints`, input)
  return res.data.data
}

export async function showWebhookEndpoint(id: string): Promise<WebhookEndpoint> {
  const res = await api.get(`/workspaces/${wid()}/webhook-endpoints/${id}`)
  return res.data.data
}

export async function updateWebhookEndpoint(
  id: string,
  input: Partial<WebhookEndpointInput>
): Promise<WebhookEndpoint> {
  const res = await api.put(`/workspaces/${wid()}/webhook-endpoints/${id}`, input)
  return res.data.data
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  await api.delete(`/workspaces/${wid()}/webhook-endpoints/${id}`)
}

export async function rotateWebhookSecret(id: string): Promise<{ id: string; secret: string; rotated_at: string }> {
  const res = await api.post(`/workspaces/${wid()}/webhook-endpoints/${id}/rotate-secret`)
  return res.data.data
}

export async function listWebhookDeliveries(id: string): Promise<WebhookDelivery[]> {
  const res = await api.get(`/workspaces/${wid()}/webhook-endpoints/${id}/deliveries`)
  return res.data.data
}

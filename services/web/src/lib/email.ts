/**
 * email.ts — Email module API client
 */
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailAccount {
  id: string
  workspace_id: string
  name: string
  email_address: string
  imap_host: string
  imap_port: number
  imap_ssl: boolean
  imap_username: string
  smtp_host?: string | null
  smtp_port?: number
  status: 'active' | 'error' | 'paused'
  last_error?: string | null
  last_synced_at?: string | null
  created_at: string
}

export interface EmailThread {
  id: string
  workspace_id: string
  email_account_id: string
  subject: string
  status: 'unread' | 'read' | 'archived' | 'snoozed'
  is_starred: boolean
  last_message_at: string | null
  message_count: number
  emails?: Email[]
}

export interface EmailAttachment {
  filename?: string
  url: string
  size?: number
  mime_type?: string
}

export interface Email {
  id: string
  thread_id: string
  direction: 'inbound' | 'outbound'
  from_address: string
  from_name?: string | null
  to_addresses: string[]
  cc_addresses: string[]
  subject: string
  body_html?: string | null
  body_text?: string | null
  is_read: boolean
  received_at: string | null
  ai_suggestions?: EmailAiSuggestion[]
  attachments?: EmailAttachment[]
}

export interface EmailAiSuggestion {
  id: string
  type: 'reply_draft' | 'task_extract' | 'summary'
  content: string
  extracted_tasks: Array<{ title: string; description?: string; priority?: string }>
  status: 'pending' | 'approved' | 'rejected'
}

// ── Account endpoints ─────────────────────────────────────────────────────────

export async function listAccounts(workspaceId: string): Promise<EmailAccount[]> {
  const res = await api.get(`/workspaces/${workspaceId}/email/accounts`)
  return res.data.data
}

export async function createAccount(
  workspaceId: string,
  payload: {
    name: string
    email_address: string
    imap_host: string
    imap_port?: number
    imap_ssl?: boolean
    imap_username: string
    imap_password: string
    smtp_host?: string
    smtp_port?: number
    smtp_username?: string
    smtp_password?: string
  }
): Promise<EmailAccount> {
  const res = await api.post(`/workspaces/${workspaceId}/email/accounts`, payload)
  return res.data.data
}

export async function deleteAccount(workspaceId: string, id: string): Promise<void> {
  await api.delete(`/workspaces/${workspaceId}/email/accounts/${id}`)
}

// ── Thread endpoints ──────────────────────────────────────────────────────────

export async function listThreads(
  workspaceId: string,
  params?: { status?: string; account_id?: string; search?: string; page?: number }
): Promise<{ data: EmailThread[]; meta: { total: number; current_page: number } }> {
  const res = await api.get(`/workspaces/${workspaceId}/email/threads`, { params })
  return res.data
}

export async function getThread(workspaceId: string, id: string): Promise<EmailThread> {
  const res = await api.get(`/workspaces/${workspaceId}/email/threads/${id}`)
  return res.data.data
}

export async function updateThread(
  workspaceId: string,
  id: string,
  patch: { status?: string; is_starred?: boolean }
): Promise<EmailThread> {
  const res = await api.patch(`/workspaces/${workspaceId}/email/threads/${id}`, patch)
  return res.data.data
}

// ── Send ──────────────────────────────────────────────────────────────────────

export async function sendEmail(
  workspaceId: string,
  payload: {
    account_id: string
    to: string[]
    subject: string
    body_html: string
    thread_id?: string
  }
): Promise<Email> {
  const res = await api.post(`/workspaces/${workspaceId}/email/send`, payload)
  return res.data.data
}

// ── AI suggestions ────────────────────────────────────────────────────────────

export async function approveSuggestion(
  workspaceId: string,
  id: string,
  boardId?: string
): Promise<EmailAiSuggestion> {
  const res = await api.post(`/workspaces/${workspaceId}/email/suggestions/${id}/approve`, {
    board_id: boardId,
  })
  return res.data.data
}

export async function rejectSuggestion(
  workspaceId: string,
  id: string
): Promise<EmailAiSuggestion> {
  const res = await api.post(`/workspaces/${workspaceId}/email/suggestions/${id}/reject`)
  return res.data.data
}

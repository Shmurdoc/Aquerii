import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  return useAuthStore.getState().workspace!.id
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'pending'
  invited_by: string | null
  invite_token: string | null
  joined_at: string | null
  created_at: string
  updated_at: string | null
  name: string
  email: string
  avatar_url: string | null
}

export type MemberRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'

export interface BillingInfo {
  plan: string
  status: string
  current_period_end: number | null
  cancel_at_period_end: boolean
  seat_count: number
  storage_used_bytes: number
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar_url: string | null
  locale: string
  timezone: string
  two_factor_enabled: boolean
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export const PLANS: { id: string; label: string; price: string; features: string[] }[] = [
  { id: 'free',     label: 'Free',     price: '$0',    features: ['3 seats', '100 MB storage', '5 automations'] },
  { id: 'starter',  label: 'Starter',  price: '$9',    features: ['10 seats', '1 GB storage', '20 automations', 'AI credits'] },
  { id: 'growth',   label: 'Growth',   price: '$29',   features: ['25 seats', '10 GB storage', '50 automations', 'AI credits', 'API access'] },
  { id: 'business', label: 'Business', price: '$99',   features: ['Unlimited seats', '100 GB storage', 'Unlimited automations', 'AI credits', 'API access', 'Priority support'] },
]

export interface AuditLogEntry {
  id: string
  user_name: string
  action: string
  ip_address: string
  created_at: string
}

export interface SessionInfo {
  id: string
  device: string
  ip_address: string
  is_current: boolean
  last_active_at: string
}

export interface NotificationPreferences {
  email_invoice_sent: boolean
  email_invoice_received: boolean
  email_invoice_paid: boolean
  email_leave_submitted: boolean
  email_leave_approved: boolean
  email_leave_declined: boolean
  email_expense_approved: boolean
  email_expense_declined: boolean
  email_meeting_invitation: boolean
  email_member_joined: boolean
  email_member_left: boolean
}

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'

export const ROLES: { value: WorkspaceRole; label: string; description: string }[] = [
  { value: 'owner',  label: 'Owner',  description: 'Full access including billing' },
  { value: 'admin',  label: 'Admin',  description: 'Full access to workspace settings and billing' },
  { value: 'manager', label: 'Manager', description: 'Can manage content and approve requests' },
  { value: 'member', label: 'Member', description: 'Can create and edit boards and documents' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to boards and documents' },
]

// ─── API Client ──────────────────────────────────────────────────────────────

export const settingsApi = {
  // Workspace
  updateWorkspace: async (payload: { name?: string; icon?: string; color?: string }): Promise<any> => {
    const res = await api.patch(`/workspaces/${wid()}`, payload)
    return res.data?.data ?? {}
  },

  // Members
  listMembers: async (): Promise<WorkspaceMember[]> => {
    const res = await api.get(`/workspaces/${wid()}/members`)
    return res.data?.data ?? []
  },

  inviteMember: async (payload: { email: string; role: MemberRole }): Promise<void> => {
    await api.post(`/workspaces/${wid()}/members`, payload)
  },

  updateMemberRole: async (userId: string, role: MemberRole): Promise<void> => {
    await api.patch(`/workspaces/${wid()}/members/${userId}`, { role })
  },

  removeMember: async (userId: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/members/${userId}`)
  },

  // Billing
  getBilling: async (): Promise<BillingInfo> => {
    const res = await api.get(`/workspaces/${wid()}/billing`)
    return res.data?.data ?? { plan: 'free', status: 'none', current_period_end: null, cancel_at_period_end: false, seat_count: 0, storage_used_bytes: 0 }
  },

  createCheckout: async (payload: { price_id: string; success_url: string; cancel_url: string }): Promise<{ url: string }> => {
    const res = await api.post(`/workspaces/${wid()}/billing/checkout`, payload)
    return res.data?.data ?? { url: '' }
  },

  createPortal: async (return_url?: string): Promise<{ url: string }> => {
    const res = await api.post(`/workspaces/${wid()}/billing/portal`, { return_url })
    return res.data?.data ?? { url: '' }
  },

  cancelSubscription: async (): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/billing/subscription`)
  },

  // Logo
  uploadLogo: async (file: File): Promise<{ logo_url: string }> => {
    const form = new FormData()
    form.append('logo', file)
    const res = await api.post(`/workspaces/${wid()}/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data?.data ?? { logo_url: '' }
  },

  removeLogo: async (): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/logo`)
  },

  // Profile
  getMe: async (): Promise<UserProfile> => {
    const res = await api.get('/me')
    return res.data?.data ?? {} as UserProfile
  },

  updateMe: async (payload: { name?: string; password?: string; password_confirmation?: string }): Promise<UserProfile> => {
    const res = await api.put('/me', payload)
    return res.data?.data ?? {} as UserProfile
  },

  // Two-factor authentication
  enableTwoFactor: async (code: string): Promise<void> => {
    await api.post('/user/two-factor-authentication', { code })
  },

  confirmTwoFactor: async (code: string): Promise<void> => {
    await api.post('/user/confirmed-two-factor-authentication', { code })
  },

  disableTwoFactor: async (): Promise<void> => {
    await api.delete('/user/two-factor-authentication')
  },

  getTwoFactorQrCode: async (): Promise<string> => {
    const res = await api.get('/user/two-factor-qr-code')
    return res.data?.data?.svg ?? res.data?.svg ?? ''
  },

  getTwoFactorRecoveryCodes: async (): Promise<string[]> => {
    const res = await api.get('/user/two-factor-recovery-codes')
    return res.data?.data ?? res.data ?? []
  },

  // Audit logs
  getAuditLogs: async (limit: number = 20): Promise<AuditLogEntry[]> => {
    const res = await api.get(`/workspaces/${wid()}/audit-logs`, { params: { limit } })
    return res.data?.data ?? []
  },

  // Sessions
  getSessions: async (): Promise<SessionInfo[]> => {
    const res = await api.get('/user/sessions')
    return res.data?.data ?? []
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/user/sessions/${sessionId}`)
  },

  // Notification preferences
  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    const res = await api.get('/user/notifications/preferences')
    return res.data?.data ?? {}
  },

  updateNotificationPreferences: async (payload: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const res = await api.put('/user/notifications/preferences', payload)
    return res.data?.data ?? {}
  },

  // Password change
  changePassword: async (payload: { current_password: string; new_password: string; new_password_confirmation: string }): Promise<void> => {
    await api.post('/user/password', payload)
  },
}

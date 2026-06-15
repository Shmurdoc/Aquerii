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

export interface PlanLimits {
  max_seats: number
  max_boards: number
  max_storage_bytes: number
  ai_credits: number
  automation_rules: number
  email_accounts: number
  crm_pipelines: number
  max_invoices: number
}

export interface FeatureFlags {
  ai: boolean
  automation: boolean
  boards: boolean
  crm_pipelines: boolean
  erp: boolean
  email: boolean
  support: boolean
  marketing: boolean
}

export interface BillingInfo {
  plan: string
  label: string
  status: string
  current_period_end: number | null
  cancel_at_period_end: boolean
  seat_count: number
  storage_used_bytes: number
  ai_credits_used: number
  limits: PlanLimits
  features: FeatureFlags
  plan_limits: PlanLimits
}

export interface BillingEventItem {
  id: string
  event_type: string
  processor: string
  amount_cents: number
  currency: string
  created_at: string
  workspace: { name: string }
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

export type PlanId = 'free' | 'starter' | 'growth' | 'business' | 'enterprise'

export interface PlanDefinition {
  id: PlanId
  label: string
  price: string
  annualPrice: string
  description: string
  popular: boolean
  features: string[]
  highlight?: string
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    label: 'Free',
    price: '$0',
    annualPrice: '$0',
    description: 'Get started with basic tools',
    popular: false,
    features: [
      '3 team members',
      '2 boards',
      '100 MB storage',
      'Basic CRM',
      '5 automation rules',
      'Email support',
    ],
  },
  {
    id: 'starter',
    label: 'Starter',
    price: '$9',
    annualPrice: '$7',
    description: 'For growing teams',
    popular: false,
    features: [
      '10 team members',
      '10 boards',
      '5 GB storage',
      'CRM pipelines',
      '200 AI credits/mo',
      '5 automation rules',
      '1 email account',
      'API access',
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    price: '$29',
    annualPrice: '$24',
    description: 'Scale your operations',
    popular: true,
    features: [
      '25 team members',
      '50 boards',
      '25 GB storage',
      'Full CRM + pipelines',
      '1,000 AI credits/mo',
      '25 automation rules',
      '3 email accounts',
      'ERP suite',
      'Support ticketing',
      'API access',
    ],
  },
  {
    id: 'business',
    label: 'Business',
    price: '$99',
    annualPrice: '$79',
    description: 'For serious organizations',
    popular: false,
    features: [
      '100 team members',
      'Unlimited boards',
      '100 GB storage',
      'Full CRM + pipelines',
      '5,000 AI credits/mo',
      'Unlimited automation rules',
      '10 email accounts',
      'Full ERP suite',
      'Support ticketing',
      'Marketing tools',
      'HR module',
      'API + export access',
    ],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 'Custom',
    annualPrice: 'Custom',
    description: 'Tailored for your enterprise',
    popular: false,
    highlight: 'Contact sales for custom pricing, dedicated support, and SLA guarantees.',
    features: [
      'Unlimited team members',
      'Unlimited boards',
      '999 TB storage',
      'Everything in Business',
      '99,999 AI credits/mo',
      'Custom integrations',
      'Dedicated support',
      'On-premise option',
      'Custom SLA',
      'SSO / SAML',
      'Audit logs',
    ],
  },
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

export interface StorageBreakdownItem {
  count: number
  bytes: number
  last_activity: string | null
}

export interface WorkspaceStorage {
  workspace_id: string
  used_bytes: number
  quota_bytes: number
  percent_used: number
  breakdown: {
    files: StorageBreakdownItem
    avatars: StorageBreakdownItem
    exports: StorageBreakdownItem
  }
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

/**
 * Display names only — these are the labels used in the workspace member
 * invitation / role-edit UI. The user's own effective permissions come
 * from GET /api/me/permissions via the `usePermissions()` hook and are
 * driven by their `account_type` and assigned system roles, not by this
 * list. Keep this in sync with backend config/aquerii-roles.php.
 */
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
    return res.data?.data ?? { plan: 'free', label: 'Free', status: 'none', current_period_end: null, cancel_at_period_end: false, seat_count: 0, storage_used_bytes: 0, limits: { max_seats: 3, max_boards: 2, max_storage_mb: 100, ai_credits: 0, automation_rules: 5, email_accounts: 0, crm_pipelines: 1, max_invoices: 0 }, features: { ai: false, automation: false, boards: true, crm_pipelines: false, erp: false, email: false, support: false, marketing: false }, plan_limits: { max_seats: 3, max_boards: 2, max_storage_mb: 100, ai_credits: 0, automation_rules: 5, email_accounts: 0, crm_pipelines: 1, max_invoices: 0 } }
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

  // Storage
  getStorage: async (): Promise<WorkspaceStorage> => {
    const res = await api.get(`/workspaces/${wid()}/storage`)
    return res.data?.data ?? { workspace_id: '', used_bytes: 0, quota_bytes: 0, percent_used: 0, breakdown: { files: { count: 0, bytes: 0, last_activity: null }, avatars: { count: 0, bytes: 0, last_activity: null }, exports: { count: 0, bytes: 0, last_activity: null } } }
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
    const res = await api.get('/me/notification-preferences')
    return res.data?.data ?? {}
  },

  updateNotificationPreferences: async (payload: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const res = await api.put('/me/notification-preferences', payload)
    return res.data?.data ?? {}
  },

  // Password change
  changePassword: async (payload: { current_password: string; new_password: string; new_password_confirmation: string }): Promise<void> => {
    await api.post('/user/password', payload)
  },
}

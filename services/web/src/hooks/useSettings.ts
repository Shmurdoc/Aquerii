import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, WorkspaceMember, BillingInfo, UserProfile, MemberRole, AuditLogEntry, SessionInfo, NotificationPreferences } from '@/lib/settings'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

// ─── Members ─────────────────────────────────────────────────────────────────

export function useWorkspaceMembers() {
  return useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members'],
    queryFn: () => settingsApi.listMembers(),
    staleTime: 30_000,
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation<void, Error, { email: string; role: MemberRole }>({
    mutationFn: (payload) => settingsApi.inviteMember(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-members'] })
      toast.success('Invitation sent')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation<void, Error, { userId: string; role: MemberRole }>({
    mutationFn: ({ userId, role }) => settingsApi.updateMemberRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-members'] })
      toast.success('Role updated')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (userId) => settingsApi.removeMember(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-members'] })
      toast.success('Member removed')
    },
    onError: (e) => toast.error(e.message),
  })
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export function useBilling() {
  return useQuery<BillingInfo>({
    queryKey: ['billing'],
    queryFn: () => settingsApi.getBilling(),
    staleTime: 60_000,
  })
}

export function useCreateCheckout() {
  return useMutation<{ url: string }, Error, { price_id: string; success_url: string; cancel_url: string }>({
    mutationFn: (payload) => settingsApi.createCheckout(payload),
    onError: (e) => toast.error(e.message),
  })
}

export function useCreatePortal() {
  return useMutation<{ url: string }, Error, string | undefined>({
    mutationFn: (return_url) => settingsApi.createPortal(return_url),
    onError: (e) => toast.error(e.message),
  })
}

export function useCancelSubscription() {
  const qc = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: () => settingsApi.cancelSubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Subscription will cancel at period end')
    },
    onError: (e) => toast.error(e.message),
  })
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export function useUpdateWorkspace() {
  const setWorkspace = useAuthStore((s) => s.setWorkspace)
  return useMutation<any, Error, { name?: string; icon?: string; color?: string }>({
    mutationFn: (payload) => settingsApi.updateWorkspace(payload),
    onSuccess: (data) => {
      setWorkspace(data)
      toast.success('Workspace updated')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateProfile() {
  const setAuth = useAuthStore((s) => s.setAuth)
  return useMutation<UserProfile, Error, { name?: string; password?: string; password_confirmation?: string }>({
    mutationFn: (payload) => settingsApi.updateMe(payload),
    onSuccess: (data) => {
      const store = useAuthStore.getState()
      if (store.user && store.workspace) {
        setAuth(store.token!, { ...store.user, name: data.name, email: data.email, avatar_url: data.avatar_url }, store.workspace)
      }
      toast.success('Profile updated')
    },
    onError: (e) => toast.error(e.message),
  })
}

// ─── Security ─────────────────────────────────────────────────────────────────

export function useAuditLogs() {
  return useQuery<AuditLogEntry[]>({
    queryKey: ['audit-logs'],
    queryFn: () => settingsApi.getAuditLogs(),
    staleTime: 30_000,
  })
}

export function useSessions() {
  return useQuery<SessionInfo[]>({
    queryKey: ['sessions'],
    queryFn: () => settingsApi.getSessions(),
    staleTime: 30_000,
  })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (sessionId) => settingsApi.revokeSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Session revoked')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useChangePassword() {
  return useMutation<void, Error, { current_password: string; new_password: string; new_password_confirmation: string }>({
    mutationFn: (payload) => settingsApi.changePassword(payload),
    onSuccess: () => toast.success('Password changed'),
    onError: (e) => toast.error(e.message),
  })
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences'],
    queryFn: () => settingsApi.getNotificationPreferences(),
    staleTime: 60_000,
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation<NotificationPreferences, Error, Partial<NotificationPreferences>>({
    mutationFn: (payload) => settingsApi.updateNotificationPreferences(payload),
    onSuccess: (data) => {
      qc.setQueryData(['notification-preferences'], data)
      toast.success('Notification preferences saved')
    },
    onError: (e) => toast.error(e.message),
  })
}

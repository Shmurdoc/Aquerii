import { useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { usePermissions } from '@/hooks/usePermissions'

export interface UsePermissionResult {
  can: (required: string) => boolean
  role: string
  isAdmin: boolean
  isOwner: boolean
}

export function usePermission(): UsePermissionResult {
  const workspaceRole = useAuthStore((s) => s.role) ?? 'member'
  const { permissions, roles, hasPermission } = usePermissions()

  const role = roles[0] ?? workspaceRole

  const can = useMemo(() => {
    return (required: string): boolean => {
      if (!required) return true
      if (required === 'admin') return role === 'admin' || role === 'owner' || role === 'platform-admin' || role === 'superadmin-creator'
      if (required === 'owner') return role === 'owner' || role === 'superadmin-creator'
      if (hasPermission(required)) return true
      if (required.endsWith('.view') || required.endsWith('.read') || required.endsWith('.list')) {
        const wildcard = required.slice(0, required.lastIndexOf('.')) + '.*'
        if (hasPermission(wildcard)) return true
      }
      return false
    }
  }, [hasPermission, role])

  return {
    can,
    role,
    isAdmin: role === 'admin' || role === 'owner' || role === 'platform-admin' || role === 'superadmin-creator',
    isOwner: role === 'owner' || role === 'superadmin-creator',
  }
}

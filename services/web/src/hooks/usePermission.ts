import { useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'workspace.*', 'members.*', 'invoices.*', 'sales_orders.*',
    'purchase_orders.*', 'crm.*', 'boards.*', 'files.*',
    'reports.*', 'meetings.*', 'employees.*', 'leave.*',
    'expenses.*', 'settings.*', 'billing.*',
  ],
  admin: [
    'workspace.*', 'members.*', 'invoices.*', 'sales_orders.*',
    'purchase_orders.*', 'crm.*', 'boards.*', 'files.*',
    'reports.*', 'meetings.*', 'employees.*', 'leave.*',
    'expenses.*', 'settings.*', 'billing.*',
  ],
  manager: [
    'workspace.view', 'workspace.update',
    'members.view', 'members.invite',
    'invoices.*', 'sales_orders.*', 'purchase_orders.*',
    'crm.*', 'boards.*', 'files.*', 'reports.view',
    'meetings.*', 'employees.view', 'leave.approve', 'expenses.approve',
  ],
  member: [
    'workspace.view',
    'boards.*', 'crm.view', 'invoices.view',
    'files.upload', 'meetings.view', 'meetings.create',
    'employees.view_own', 'leave.request', 'expenses.submit',
  ],
  viewer: ['workspace.view', 'boards.view', 'crm.view'],
}

function permissionMatches(userPerms: string[], required: string): boolean {
  for (const perm of userPerms) {
    if (perm === required) return true
    if (perm.endsWith('.*')) {
      const prefix = perm.slice(0, -2)
      if (required === prefix || required.startsWith(prefix + '.')) return true
    }
  }
  return false
}

export function usePermission() {
  const role = useAuthStore((s) => s.role) ?? 'member'

  const permissions = useMemo(() => ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.member, [role])

  const can = useMemo(() => {
    return (required: string): boolean => {
      if (required === 'admin') return role === 'admin' || role === 'owner'
      if (required === 'owner') return role === 'owner'
      return permissionMatches(permissions, required)
    }
  }, [permissions, role])

  return {
    can,
    role,
    isAdmin: role === 'admin' || role === 'owner',
    isOwner: role === 'owner',
  }
}

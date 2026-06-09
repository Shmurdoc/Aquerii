import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface PermissionsResponse {
  permissions: string[]
  roles: string[]
  account_type: string
}

export interface UsePermissionsResult {
  permissions: string[]
  roles: string[]
  account_type: string
  isLoading: boolean
  isError: boolean
  hasPermission: (p: string) => boolean
  hasRole: (r: string) => boolean
}

async function fetchPermissions(): Promise<PermissionsResponse> {
  const res = await api.get('/me/permissions')
  return res.data?.data ?? { permissions: [], roles: [], account_type: 'employee' }
}

export function usePermissions(): UsePermissionsResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me', 'permissions'],
    queryFn: fetchPermissions,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const permissions = data?.permissions ?? []
  const roles = data?.roles ?? []
  const account_type = data?.account_type ?? 'employee'

  const hasPermission = useCallback(
    (required: string): boolean => matchesPermission(permissions, required),
    [permissions],
  )

  const hasRole = useCallback(
    (required: string): boolean => roles.includes(required),
    [roles],
  )

  return {
    permissions,
    roles,
    account_type,
    isLoading,
    isError,
    hasPermission,
    hasRole,
  }
}

function matchesPermission(userPerms: string[], required: string): boolean {
  if (required === '') return true

  for (const perm of userPerms) {
    if (perm === required) return true
    if (perm === '*' || perm === '*.*') return true
    if (perm.endsWith('.*')) {
      const prefix = perm.slice(0, -2)
      if (required === prefix || required.startsWith(prefix + '.')) return true
    }
  }

  return false
}

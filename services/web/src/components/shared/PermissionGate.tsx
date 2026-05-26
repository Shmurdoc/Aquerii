import React from 'react'
import { usePermission } from '@/hooks/usePermission'

interface Props {
  permission: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({ permission, fallback = null, children }: Props) {
  const { can } = usePermission()
  return can(permission) ? <>{children}</> : <>{fallback}</>
}

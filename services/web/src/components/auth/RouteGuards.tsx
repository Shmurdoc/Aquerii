import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const workspace = useAuthStore(s => s.workspace)
  return workspace ? <>{children}</> : <Navigate to="/onboarding" replace />
}

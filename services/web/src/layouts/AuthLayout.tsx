import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useBranding } from '@/contexts/BrandingContext'
import { InitialsAvatar } from '@/components/shared/InitialsAvatar'

export default function AuthLayout() {
  const token    = useAuthStore(s => s.token)
  const branding = useBranding()

  if (token) return <Navigate to="/boards" replace />

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          {branding.isDefault ? (
            <>
              <h1 className="text-3xl font-bold text-white tracking-tight">Aquerii</h1>
              <p className="text-gray-400 mt-1 text-sm">Work that flows.</p>
            </>
          ) : branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.name} className="h-12 object-contain mb-2" />
          ) : (
            <InitialsAvatar name={branding.name} color={branding.color} size={48} shape="rounded" />
          )}
          {!branding.isDefault && (
            <h1 className="mt-3 text-xl font-semibold text-white">Welcome to {branding.name}</h1>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

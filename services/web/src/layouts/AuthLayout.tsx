import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function AuthLayout() {
  const token = useAuthStore(s => s.token)
  if (token) return <Navigate to="/boards" replace />

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Aquerii</h1>
          <p className="text-gray-400 mt-1 text-sm">Work that flows.</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

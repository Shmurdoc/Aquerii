import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'

import AuthLayout    from '@/components/layout/AuthLayout'
import AppLayout     from '@/components/layout/AppLayout'

import LoginPage     from '@/pages/auth/LoginPage'
import RegisterPage  from '@/pages/auth/RegisterPage'
import OnboardingPage from '@/pages/onboarding/OnboardingPage'

import BoardsPage    from '@/pages/boards/BoardsPage'
import BoardPage     from '@/pages/boards/BoardPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import DocumentPage  from '@/pages/documents/DocumentPage'
import CRMPage       from '@/pages/crm/CRMPage'
import SettingsPage  from '@/pages/settings/SettingsPage'
import NotFoundPage  from '@/pages/NotFoundPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const workspace = useAuthStore(s => s.workspace)
  return workspace ? <>{children}</> : <Navigate to="/onboarding" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color:      '#f3f4f6',
            border:     '1px solid #374151',
            fontSize:   '13px',
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route element={<AuthLayout />}>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Onboarding (auth required, workspace not yet set) */}
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingPage />
            </RequireAuth>
          }
        />

        {/* App (auth + workspace required) */}
        <Route
          element={
            <RequireAuth>
              <RequireOnboarding>
                <AppLayout />
              </RequireOnboarding>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/boards" replace />} />
          <Route path="/boards"          element={<BoardsPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="/documents"       element={<DocumentsPage />} />
          <Route path="/documents/:docId" element={<DocumentPage />} />
          <Route path="/crm"             element={<CRMPage />} />
          <Route path="/settings"        element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

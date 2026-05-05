import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import AuthLayout   from '@/layouts/AuthLayout'
import AppLayout    from '@/layouts/AppLayout'
import LoginPage    from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import BoardsPage   from '@/pages/boards/BoardsPage'
import BoardPage    from '@/pages/boards/BoardPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import DocumentPage  from '@/pages/documents/DocumentPage'
import CRMPage      from '@/pages/crm/CRMPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* App */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/boards" replace />} />
          <Route path="/boards"              element={<BoardsPage />} />
          <Route path="/boards/:boardId"     element={<BoardPage />} />
          <Route path="/documents"           element={<DocumentsPage />} />
          <Route path="/documents/:docId"    element={<DocumentPage />} />
          <Route path="/crm"                 element={<CRMPage />} />
          <Route path="/settings/*"          element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

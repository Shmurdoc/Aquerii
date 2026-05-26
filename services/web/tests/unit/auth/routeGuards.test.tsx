import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { RequireAuth, RequireOnboarding } from '@/components/auth/RouteGuards'

const mockUser = { id: 'u1', name: 'User', email: 'u@t.com', avatar_url: null, mfa_enabled: false }
const mockWorkspace = { id: 'w1', name: 'W', slug: 'w', plan: 'free' }

beforeEach(() => {
  sessionStorage.clear()
  useAuthStore.setState({ token: null, user: null, workspace: null })
})

function renderGuard(Guard: typeof RequireAuth, route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/onboarding" element={<div>Onboarding Page</div>} />
        <Route path="/" element={<Guard><div>Protected Content</div></Guard>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAuth', () => {
  it('redirects to /login when no token', () => {
    renderGuard(RequireAuth, '/')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when token exists', () => {
    useAuthStore.setState({ token: 'tok', user: mockUser, workspace: mockWorkspace })
    renderGuard(RequireAuth, '/')
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})

describe('RequireOnboarding', () => {
  it('redirects to /onboarding when no workspace', () => {
    useAuthStore.setState({ token: 'tok', user: mockUser, workspace: null })
    renderGuard(RequireOnboarding, '/')
    expect(screen.getByText('Onboarding Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when workspace exists', () => {
    useAuthStore.setState({ token: 'tok', user: mockUser, workspace: mockWorkspace })
    renderGuard(RequireOnboarding, '/')
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Onboarding Page')).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from '../Sidebar'

beforeEach(() => {
  useAuthStore.setState({
    workspace: { id: 'ws-1', name: 'Acme Corp', slug: 'acme', plan: 'pro', logo_url: null, color: '#7c3aed' },
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatar_url: null, mfa_enabled: false },
    role: 'admin',
  })
})

describe('Sidebar', () => {
  it('renders workspace name', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('falls back to default workspace name', () => {
    useAuthStore.setState({ workspace: null })
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Aquerii')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Boards')).toBeInTheDocument()
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('CRM')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders nav icons', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Boards').closest('a')).toHaveAttribute('href', '/boards')
    expect(screen.getByText('Documents').closest('a')).toHaveAttribute('href', '/documents')
    expect(screen.getByText('CRM').closest('a')).toHaveAttribute('href', '/crm')
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings')
  })

  it('shows workspace initial in avatar', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})

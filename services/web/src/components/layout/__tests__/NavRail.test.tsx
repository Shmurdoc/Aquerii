import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useNotificationStore } from '@/stores/notificationStore'
import NavRail from '../NavRail'

function renderNavRail(onCmdOpen = vi.fn()) {
  return render(
    <MemoryRouter>
      <NavRail onCmdOpen={onCmdOpen} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useAuthStore.setState({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatar_url: null, mfa_enabled: false },
    workspace: { id: 'ws-1', name: 'Acme Corp', slug: 'acme', plan: 'pro', logo_url: null, color: '#7c3aed' },
    role: 'admin',
  })
  useNotificationStore.setState({ notifications: [], unreadCount: 0, hasMore: false })
  useThemeStore.setState({ theme: 'dark' })
  localStorage.clear()
})

describe('NavRail', () => {
  it('renders workspace name', () => {
    renderNavRail()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders navigation sections', () => {
    renderNavRail()
    expect(screen.getAllByText('Workspace').length).toBeGreaterThan(0)
    expect(screen.getByText('Communication')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders nav links', () => {
    renderNavRail()
    expect(screen.getByLabelText('Dashboard')).toBeInTheDocument()
    expect(screen.getByLabelText('Boards')).toBeInTheDocument()
    expect(screen.getByLabelText('Documents')).toBeInTheDocument()
  })

  it('calls onCmdOpen when search is clicked', () => {
    const onCmdOpen = vi.fn()
    renderNavRail(onCmdOpen)
    fireEvent.click(screen.getByLabelText('Search (⌘K)'))
    expect(onCmdOpen).toHaveBeenCalledTimes(1)
  })

  it('toggles collapse on button click', () => {
    renderNavRail()
    const collapseBtn = screen.getByLabelText('Collapse sidebar')
    fireEvent.click(collapseBtn)
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
  })

  it('toggles theme', () => {
    renderNavRail()
    const themeBtn = screen.getByLabelText('Switch to light theme')
    fireEvent.click(themeBtn)
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('displays unread notification count', () => {
    useNotificationStore.setState({ unreadCount: 5 })
    renderNavRail()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders user profile button', () => {
    renderNavRail()
    expect(screen.getByLabelText('Test User')).toBeInTheDocument()
  })

  it('renders settings link with permission', () => {
    useAuthStore.setState({ role: 'admin' })
    renderNavRail()
    expect(screen.getByLabelText('Settings')).toBeInTheDocument()
  })
})

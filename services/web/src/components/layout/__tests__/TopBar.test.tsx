import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useNotificationStore } from '@/stores/notificationStore'
import TopBar from '../TopBar'

function renderTopBar(props = {}) {
  const defaultProps = {
    onMenuOpen: vi.fn(),
    onNotifOpen: vi.fn(),
    onCmdOpen: vi.fn(),
    ...props,
  }
  return {
    ...render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <TopBar {...defaultProps} />
      </MemoryRouter>
    ),
    ...defaultProps,
  }
}

beforeEach(() => {
  useAuthStore.setState({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatar_url: null, mfa_enabled: false },
    workspace: { id: 'ws-1', name: 'Acme Corp', slug: 'acme', plan: 'pro', logo_url: null, color: '#7c3aed' },
    role: 'admin',
  })
  useNotificationStore.setState({ notifications: [], unreadCount: 0, hasMore: false })
  useThemeStore.setState({ theme: 'dark' })
  vi.clearAllMocks()
})

describe('TopBar', () => {
  it('renders page title from pathname', () => {
    renderTopBar()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
  })

  it('calls onMenuOpen when hamburger is clicked', () => {
    const { onMenuOpen } = renderTopBar()
    fireEvent.click(screen.getByLabelText('Open navigation menu'))
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
  })

  it('calls onNotifOpen when bell is clicked', () => {
    const { onNotifOpen } = renderTopBar()
    fireEvent.click(screen.getByLabelText('Notifications'))
    expect(onNotifOpen).toHaveBeenCalledTimes(1)
  })

  it('calls onCmdOpen when search is clicked', () => {
    const { onCmdOpen } = renderTopBar()
    fireEvent.click(screen.getByLabelText('Search'))
    expect(onCmdOpen).toHaveBeenCalledTimes(1)
  })

  it('displays user name in profile button', () => {
    renderTopBar()
    expect(screen.getByLabelText('User menu')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('shows unread notification count', () => {
    useNotificationStore.setState({ unreadCount: 3 })
    renderTopBar()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('opens profile dropdown on click', () => {
    renderTopBar()
    fireEvent.click(screen.getByLabelText('User menu'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('opens quick create menu', () => {
    renderTopBar()
    fireEvent.click(screen.getByLabelText('Quick create'))
    expect(screen.getByText('Quick create')).toBeInTheDocument()
    expect(screen.getByText('Task')).toBeInTheDocument()
  })

  it('toggles theme menu', () => {
    renderTopBar()
    fireEvent.click(screen.getByLabelText('Toggle theme'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
  })

  it('renders breadcrumbs on desktop', () => {
    renderTopBar()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
  })
})

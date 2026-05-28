import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { api } from '@/lib/api'
import clsx from 'clsx'

interface Props {
  onMenuOpen: () => void
  onNotifOpen: () => void
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inbox': 'Inbox',
  '/meetings': 'Meetings',
  '/employees': 'Employees',
  '/boards': 'Boards',
  '/documents': 'Notes',
  '/documents/files': 'Files',
  '/crm': 'CRM',
  '/crm/contacts': 'Contacts',
  '/crm/leads': 'Leads',
  '/crm/forecast': 'Forecast',
  '/crm/quotas': 'Quotas',
  '/crm/sequences': 'Sequences',
  '/support': 'Support',
  '/support/tickets': 'Tickets',
  '/support/knowledge-base': 'Knowledge Base',
  '/support/slas': 'SLAs',
  '/marketing': 'Marketing',
  '/marketing/campaigns': 'Campaigns',
  '/marketing/email-templates': 'Email Templates',
  '/marketing/segments': 'Segments',
  '/erp': 'ERP',
  '/erp/invoicing': 'Invoicing',
  '/erp/purchasing': 'Purchasing',
  '/erp/sales': 'Sales',
  '/erp/inventory': 'Inventory',
  '/erp/accounting': 'Accounting',
  '/automation': 'Automation',
  '/reports': 'Reports',
  '/ai/chat': 'AI Chat',
  '/email': 'Email',
  '/settings': 'Settings',
  '/settings/profile': 'Profile',
  '/settings/team': 'Team',
  '/settings/billing': 'Billing',
  '/settings/security': 'Security',
  '/settings/notifications': 'Notifications',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]

  const boardMatch = pathname.match(/^\/boards\/(.+)/)
  if (boardMatch) return 'Board'

  const docMatch = pathname.match(/^\/documents\/(.+)/)
  if (docMatch) return 'Document'

  const ticketMatch = pathname.match(/^\/support\/tickets\/(.+)/)
  if (ticketMatch) return 'Ticket'

  return 'Aquerii'
}

function getBreadcrumbs(pathname: string): { label: string; to?: string }[] {
  const parts = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; to?: string }[] = []

  let accumulated = ''
  for (const part of parts) {
    accumulated += '/' + part
    const title = PAGE_TITLES[accumulated] || part.charAt(0).toUpperCase() + part.slice(1)
    crumbs.push({ label: title, to: accumulated === pathname ? undefined : accumulated })
  }

  return crumbs.length > 0 ? crumbs : [{ label: 'Dashboard', to: '/dashboard' }]
}

export default function TopBar({ onMenuOpen, onNotifOpen }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.logout)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      window.addEventListener('mousedown', handler)
      return () => window.removeEventListener('mousedown', handler)
    }
  }, [dropdownOpen])

  const crumbs = getBreadcrumbs(pathname)
  const pageTitle = getPageTitle(pathname)

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    clearAuth()
    setDropdownOpen(false)
    navigate('/login')
  }

  return (
    <header
      className="md:hidden flex items-center gap-3 px-3 h-12 shrink-0"
      style={{
        background: 'var(--color-bg-base)',
        borderBottom: '1px solid var(--color-glass-border)',
      }}
    >
      <button
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-hover transition-colors"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted truncate leading-tight">
          {crumbs.map((crumb, i) => (
            <span key={crumb.to ?? crumb.label}>
              {i > 0 && <span className="mx-1 text-muted">/</span>}
              {crumb.to ? (
                <button
                  onClick={() => navigate(crumb.to!)}
                  className="hover:text-primary transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-primary">{crumb.label}</span>
              )}
            </span>
          ))}
        </p>
      </div>

      <button
        onClick={onNotifOpen}
        className="relative p-1.5 text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none"
            aria-label={`${unreadCount} unread`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          aria-label="User menu"
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold">
              {user?.name?.[0] ?? 'U'}
            </div>
          )}
          <ChevronDown size={12} className="text-muted" />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-44 py-1 rounded-lg shadow-lg z-50"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-glass-border)',
            }}
          >
            <div className="px-3 py-2 text-xs text-muted truncate" style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
              {user?.email ?? ''}
            </div>
            <button
              onClick={() => { navigate('/settings/profile'); setDropdownOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
            >
              <User size={14} />
              Profile
            </button>
            <button
              onClick={() => { navigate('/settings'); setDropdownOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
            >
              <Settings size={14} />
              Settings
            </button>
            <div style={{ borderTop: '1px solid var(--color-glass-border)' }} className="mt-1 pt-1">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

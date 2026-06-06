import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Menu, Bell, ChevronDown, LogOut, Settings, User, Plus, Search,
  Sun, Moon, CheckSquare, FileText, LayoutGrid, Video, Ticket, Users,
  Calendar, Mail, Sparkles, Command, type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useThemeStore } from '@/stores/themeStore'
import { api } from '@/lib/api'
import { InitialsAvatar } from '@/components/shared/InitialsAvatar'
import clsx from 'clsx'
import { staggerStyle } from '@/lib/motion'

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
  '/crm/products': 'Products',
  '/crm/quotes': 'Quotes',
  '/crm/calendar-sync': 'Calendar Sync',
  '/crm/approval-rules': 'Approval Rules',
  '/crm/deal-approvals': 'Deal Approvals',
  '/crm/automation-rules': 'Automation Rules',
  '/erp/financial-approvals': 'Financial Approvals',
  '/erp/report-schedules': 'Report Schedules',
  '/erp/goals': 'Goals & OKRs',
  '/erp/meeting-outcomes': 'Meeting Outcomes',
  '/erp/email-addresses': 'Email Addresses',
  '/erp/employee-groups': 'Employee Groups',
  '/erp/audit-logs': 'Audit Logs',
  '/erp/webhook-events': 'Webhook Events',
  '/support': 'Support',
  '/support/tickets': 'Tickets',
  '/support/knowledge-base': 'Knowledge Base',
  '/support/slas': 'SLAs',
  '/marketing': 'Marketing',
  '/marketing/campaigns': 'Campaigns',
  '/marketing/email-templates': 'Email Templates',
  '/marketing/segments': 'Segments',
  '/erp': 'ERP',
  '/erp/job-cards': 'Job Cards',
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
  '/my-day': 'My Day',
  '/calendar': 'Calendar',
  '/chat': 'Chat',
  '/hsse': 'HSSE',
  '/hsse/dashboard': 'HSSE',
  '/hsse/incidents': 'Incidents',
  '/hsse/hazards': 'Hazards',
  '/hsse/actions': 'Corrective Actions',
  '/ptw': 'Permits',
  '/ptw/permits': 'Permits',
  '/scenarios': 'Scenarios',
  '/plugins': 'Plugins',
  '/onboarding': 'Welcome',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (/^\/boards\/.+/.test(pathname)) return 'Board'
  if (/^\/documents\/.+/.test(pathname)) return 'Document'
  if (/^\/support\/tickets\/.+/.test(pathname)) return 'Ticket'
  if (/^\/ptw\/permits\/.+/.test(pathname)) return 'Permit'
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

type QuickCreate = { label: string; icon: LucideIcon; to: string; hue: string }

const QUICK_CREATE: QuickCreate[] = [
  { label: 'Task',         icon: CheckSquare, to: '/boards',           hue: 'accent' },
  { label: 'Board',        icon: LayoutGrid,  to: '/boards',           hue: 'info' },
  { label: 'Document',     icon: FileText,    to: '/documents',        hue: 'success' },
  { label: 'Meeting',      icon: Video,       to: '/meetings',         hue: 'warning' },
  { label: 'Ticket',       icon: Ticket,      to: '/support/tickets',  hue: 'danger' },
  { label: 'Deal',         icon: Users,       to: '/crm',              hue: 'rose' },
  { label: 'Event',        icon: Calendar,    to: '/calendar',         hue: 'info' },
  { label: 'Email',        icon: Mail,        to: '/email',            hue: 'slate' },
  { label: 'AI Assistant', icon: Sparkles,    to: '/ai/chat',          hue: 'accent' },
]

interface Props {
  onMenuOpen: () => void
  onNotifOpen: () => void
  onCmdOpen: () => void
}

export default function TopBar({ onMenuOpen, onNotifOpen, onCmdOpen }: Props) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const createRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const workspace = useAuthStore((s) => s.workspace)
  const clearAuth = useAuthStore((s) => s.logout)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false)
      if (createRef.current && !createRef.current.contains(target)) setCreateOpen(false)
      if (themeRef.current && !themeRef.current.contains(target)) setThemeMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const crumbs = useMemo(() => getBreadcrumbs(pathname), [pathname])
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname])

  const logout = async () => {
    try { await api.post('/auth/logout') } catch { /* noop */ }
    clearAuth()
    setProfileOpen(false)
    navigate('/login')
  }

  return (
    <header
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 h-14 shrink-0 bg-[var(--color-bg-base)]/85 backdrop-blur-md border-b border-[var(--color-glass-border)] z-[var(--z-sticky)]"
    >
      <button
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors press-shrink"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      <div className="hidden md:flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 text-label text-[var(--color-text-muted)]">
          {crumbs.slice(0, -1).map((crumb, i) => (
            <span key={crumb.to ?? crumb.label} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--color-text-muted)]/60">/</span>}
              {crumb.to ? (
                <button
                  onClick={() => navigate(crumb.to!)}
                  className="hover:text-[var(--color-text-primary)] transition-colors duration-150 truncate max-w-[160px]"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="truncate max-w-[160px]">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
        <h1 className="text-heading font-semibold text-[var(--color-text-primary)] truncate">
          {pageTitle}
        </h1>
      </div>

      <div className="md:hidden flex-1 min-w-0">
        <h1 className="text-body font-semibold text-[var(--color-text-primary)] truncate">
          {pageTitle}
        </h1>
      </div>

      <div className="flex-1 md:flex-none" />

      <button
        onClick={onCmdOpen}
        aria-label="Search"
        className={clsx(
          'hidden md:inline-flex items-center gap-2 h-9 px-3 rounded-md',
          'bg-[var(--color-bg-input)] border border-[var(--color-glass-border)]',
          'text-body-sm text-[var(--color-text-muted)]',
          'hover:border-[var(--color-glass-border-hover)] hover:text-[var(--color-text-secondary)]',
          'transition-all duration-150 min-w-[260px] press-shrink',
        )}
      >
        <Search size={14} aria-hidden="true" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="inline-flex items-center text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-hover)] border border-[var(--color-glass-border)] rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>

      <div ref={createRef} className="relative">
        <button
          onClick={() => setCreateOpen((v) => !v)}
          aria-label="Quick create"
          aria-expanded={createOpen}
          aria-haspopup="menu"
          className={clsx(
            'h-9 px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-md',
            'text-white font-medium text-body-sm',
            'shadow-[var(--shadow-md)] press-shrink',
            'hover:shadow-[var(--shadow-elevated)]',
            'focus:outline-none focus-visible:shadow-[var(--shadow-focus)]',
          )}
          style={{ background: 'var(--gradient-accent)' }}
        >
          <Plus size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Create</span>
        </button>

        {createOpen && (
          <CreateMenu
            onClose={() => setCreateOpen(false)}
            onPick={(q) => {
              setCreateOpen(false)
              navigate(q.to)
            }}
          />
        )}
      </div>

      <button
        onClick={onNotifOpen}
        className="relative w-9 h-9 inline-flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors press-shrink"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <Bell size={16} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 bg-[var(--color-status-blocked)] text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center leading-none tabular-nums"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <div ref={themeRef} className="relative hidden sm:block">
        <button
          onClick={() => setThemeMenuOpen((v) => !v)}
          aria-label="Toggle theme"
          aria-expanded={themeMenuOpen}
          className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors press-shrink"
        >
          {theme === 'dark' ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}
        </button>
        {themeMenuOpen && (
          <Dropdown align="right" className="w-44">
            <DropdownItem
              icon={Moon}
              label="Dark"
              active={theme === 'dark'}
              onClick={() => { toggleTheme(); setThemeMenuOpen(false) }}
            />
            <DropdownItem
              icon={Sun}
              label="Light"
              active={theme === 'light'}
              onClick={() => { toggleTheme(); setThemeMenuOpen(false) }}
            />
            <DropdownSeparator />
            <DropdownItem
              icon={Command}
              label="Keyboard shortcuts"
              onClick={() => { setThemeMenuOpen(false); onCmdOpen() }}
            />
          </Dropdown>
        )}
      </div>

      <div ref={profileRef} className="relative">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          aria-label="User menu"
          aria-expanded={profileOpen}
          aria-haspopup="menu"
          className="inline-flex items-center gap-2 h-9 pl-1 pr-2 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors duration-150 press-shrink"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full" />
          ) : workspace ? (
            <InitialsAvatar name={user?.name ?? workspace.name} color={workspace.color ?? '#7c3aed'} size={28} shape="rounded" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-[10px] font-bold">
              {user?.name?.[0] ?? 'U'}
            </div>
          )}
          <span className="hidden md:inline text-body-sm text-[var(--color-text-secondary)] truncate max-w-[120px]">
            {user?.name ?? 'Profile'}
          </span>
          <ChevronDown size={12} className="text-[var(--color-text-muted)]" aria-hidden="true" />
        </button>

        {profileOpen && (
          <Dropdown align="right" className="w-60">
            <div className="px-3 py-2.5 border-b border-[var(--color-glass-border)]">
              <p className="text-body-sm font-semibold text-[var(--color-text-primary)] truncate">
                {user?.name ?? 'Guest'}
              </p>
              <p className="text-label text-[var(--color-text-muted)] truncate">
                {user?.email ?? ''}
              </p>
            </div>
            <DropdownItem icon={User}     label="Profile"   onClick={() => { setProfileOpen(false); navigate('/settings/profile') }} />
            <DropdownItem icon={Settings} label="Settings"  onClick={() => { setProfileOpen(false); navigate('/settings') }} />
            <DropdownSeparator />
            <DropdownItem icon={LogOut}   label="Sign out"  onClick={logout} danger />
          </Dropdown>
        )}
      </div>
    </header>
  )
}

const HUE_BG: Record<string, string> = {
  accent:  'var(--color-accent)',
  info:    'var(--color-status-review)',
  success: 'var(--color-status-done)',
  warning: 'var(--color-status-progress)',
  danger:  'var(--color-status-blocked)',
  rose:    'var(--row-9)',
  slate:   'var(--row-10)',
}

function CreateMenu({ onClose: _onClose, onPick }: { onClose: () => void; onPick: (q: QuickCreate) => void }) {
  return (
    <Dropdown align="right" className="w-64 p-1.5">
      <p className="px-2.5 py-1.5 text-micro font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        Quick create
      </p>
      {QUICK_CREATE.map((q, i) => {
        const Icon = q.icon
        return (
          <button
            key={q.label}
            type="button"
            onClick={() => onPick(q)}
            style={staggerStyle(i)}
            className="stagger-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-body-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors duration-150 text-left"
          >
            <span
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in oklab, ${HUE_BG[q.hue] ?? HUE_BG.accent} 18%, transparent)`, color: HUE_BG[q.hue] ?? HUE_BG.accent }}
              aria-hidden="true"
            >
              <Icon size={14} />
            </span>
            {q.label}
          </button>
        )
      })}
    </Dropdown>
  )
}

function Dropdown({ align = 'right', className, children }: { align?: 'left' | 'right'; className?: string; children: ReactNode }) {
  return (
    <div
      role="menu"
      className={clsx(
        'absolute mt-1.5 py-1 rounded-md',
        'bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)]',
        'shadow-[var(--shadow-elevated)] z-[var(--z-dropdown)]',
        'animate-fade-in min-w-full',
        align === 'right' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

function DropdownItem({
  icon: Icon,
  label,
  onClick,
  active,
  danger,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2.5 px-3 py-2 text-body-sm text-left',
        'transition-colors duration-150',
        active
          ? 'bg-[var(--color-accent-light)] text-[var(--color-text-primary)]'
          : danger
            ? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-status-blocked)]/15 hover:text-[var(--color-status-blocked)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
      )}
    >
      <Icon size={14} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function DropdownSeparator() {
  return <div className="my-1 border-t border-[var(--color-glass-border)]" />
}

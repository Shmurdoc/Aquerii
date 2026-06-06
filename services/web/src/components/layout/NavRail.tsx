import { useState, useEffect, Fragment } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, FileText, Users, Settings, Bell,
  Inbox, Search, Wallet, Zap, ChevronLeft, ChevronRight, BarChart2,
  UserCheck, Video, Sparkles, Sun, Moon, HeadphonesIcon, Megaphone, Mail, CalendarDays,
  MessageSquare, GitBranch, Package, FileCheck2, ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { usePermission } from '@/hooks/usePermission'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { InitialsAvatar } from '@/components/shared/InitialsAvatar'
import clsx from 'clsx'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  permission?: string
}

interface NavSection {
  label: string
  accent: 'violet' | 'cyan' | 'amber' | 'rose' | 'emerald' | 'slate'
  items: NavItem[]
}

const SECTION_ACCENT: Record<NavSection['accent'], string> = {
  violet:  'var(--color-accent)',
  cyan:    '#06b6d4',
  amber:   '#f59e0b',
  rose:    '#ec4899',
  emerald: '#10b981',
  slate:   '#64748b',
}

const SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    accent: 'violet',
    items: [
      { to: '/my-day',    icon: Sun,          label: 'My Day'    },
      { to: '/calendar',  icon: CalendarDays, label: 'Calendar'  },
      { to: '/dashboard', icon: LayoutGrid,   label: 'Dashboard'  },
      { to: '/boards',    icon: LayoutGrid,   label: 'Boards'     },
      { to: '/documents', icon: FileText,     label: 'Documents'  },
    ],
  },
  {
    label: 'CRM',
    accent: 'rose',
    items: [
      { to: '/crm', icon: Users, label: 'CRM', permission: 'crm.*' },
    ],
  },
  {
    label: 'Communication',
    accent: 'cyan',
    items: [
      { to: '/inbox',    icon: Inbox,          label: 'Inbox'    },
      { to: '/chat',     icon: MessageSquare,  label: 'Chat'     },
      { to: '/meetings', icon: Video,          label: 'Meetings', permission: 'meetings.*' },
      { to: '/email',    icon: Mail,           label: 'Email'    },
      { to: '/ai/chat',  icon: Sparkles,       label: 'AI Chat'  },
    ],
  },
  {
    label: 'ERP',
    accent: 'amber',
    items: [
      { to: '/erp', icon: Wallet, label: 'ERP', permission: 'invoices.*' },
    ],
  },
  {
    label: 'Safety',
    accent: 'emerald',
    items: [
      { to: '/hsse', icon: ShieldAlert, label: 'HSSE' },
      { to: '/ptw',  icon: FileCheck2,  label: 'Permits' },
    ],
  },
  {
    label: 'Admin',
    accent: 'slate',
    items: [
      { to: '/automation', icon: Zap,           label: 'Automation' },
      { to: '/scenarios',  icon: GitBranch,     label: 'Scenarios' },
      { to: '/plugins',    icon: Package,       label: 'Plugins' },
      { to: '/reports',    icon: BarChart2,     label: 'Reports',   permission: 'reports.*' },
      { to: '/support',    icon: HeadphonesIcon,label: 'Support'  },
      { to: '/marketing',  icon: Megaphone,     label: 'Marketing'  },
      { to: '/employees',  icon: UserCheck,     label: 'Employees', permission: 'employees.*' },
    ],
  },
]

const STORAGE_KEY = 'sidebar:collapsed'

interface Props {
  onCmdOpen: () => void
}

export default function NavRail({ onCmdOpen }: Props) {
  const user        = useAuthStore(s => s.user)
  const workspace   = useAuthStore(s => s.workspace)
  const unreadCount = useNotificationStore(s => s.unreadCount)
  const theme       = useThemeStore(s => s.theme)
  const toggleTheme = useThemeStore(s => s.toggleTheme)
  const navigate    = useNavigate()

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)) } catch { /* noop */ }
  }, [collapsed])

  const expanded = !collapsed

  const labelStyle: React.CSSProperties = {
    opacity: expanded ? 1 : 0,
    width: expanded ? 'auto' : 0,
    overflow: 'hidden',
    transition: 'opacity var(--duration-200) var(--ease-out), width var(--duration-300) var(--ease-spring)',
    whiteSpace: 'nowrap',
  }

  const sectionLabelStyle: React.CSSProperties = {
    opacity: expanded ? 1 : 0,
    overflow: 'hidden',
    transition: 'opacity var(--duration-200) var(--ease-out)',
    whiteSpace: 'nowrap',
  }

  return (
    <aside
      aria-label="Main navigation"
      style={{
        width: collapsed ? '60px' : '232px',
        transition: 'width var(--duration-300) var(--ease-spring)',
        background: 'var(--color-bg-base)',
        borderRight: '1px solid var(--color-glass-border)',
      }}
      className="flex flex-col shrink-0 z-[var(--z-sticky)] overflow-hidden"
    >
      <button
        className="flex items-center gap-2.5 px-3 py-3 mb-1 hover:bg-[var(--color-bg-hover)] rounded-none transition-colors duration-150 w-full text-left"
        aria-label={workspace?.name ?? 'Aquerii'}
        title={collapsed ? (workspace?.name ?? 'Aquerii') : undefined}
      >
        {workspace?.logo_url ? (
          <img
            src={workspace.logo_url}
            alt={workspace.name}
            className="h-8 w-8 rounded-md object-contain bg-white/5 shrink-0 ring-1 ring-[var(--color-glass-border)]"
          />
        ) : (
          <InitialsAvatar
            name={workspace?.name ?? 'Aquerii'}
            color={workspace?.color ?? '#7c3aed'}
            size={32}
            shape="rounded"
          />
        )}
        <div className="min-w-0 flex-1" style={labelStyle}>
          <p className="text-body font-semibold text-[var(--color-text-primary)] truncate">
            {workspace?.name ?? 'Aquerii'}
          </p>
          <p className="text-micro text-[var(--color-text-muted)] truncate">
            Workspace
          </p>
        </div>
      </button>

      <button
        onClick={onCmdOpen}
        title="Search (⌘K)"
        aria-label="Search (⌘K)"
        className="mx-1.5 mb-1 h-9 flex items-center gap-2.5 px-2.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] border border-transparent hover:border-[var(--color-glass-border)] transition-all duration-150 ease-out"
      >
        <Search size={15} className="shrink-0" aria-hidden="true" />
        <span className="text-body-sm flex-1 text-left truncate" style={labelStyle}>
          Search…
        </span>
        <span
          className="hidden sm:inline-flex items-center text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-hover)] border border-[var(--color-glass-border)] rounded px-1.5 py-0.5"
          style={labelStyle}
          aria-hidden="true"
        >
          ⌘K
        </span>
      </button>

      <nav className="flex-1 flex flex-col gap-1 px-1.5 mt-1 overflow-y-auto" aria-label="App sections">
        {SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-0.5">
            <span
              className="text-micro font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-2 py-1"
              style={sectionLabelStyle}
            >
              {section.label}
            </span>
            {section.items.map(({ to, icon: Icon, label, permission }) => {
              const accent = SECTION_ACCENT[section.accent]
              const link = (
                <NavLink
                  to={to}
                  aria-label={label}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    clsx(
                      'group/nav relative flex items-center gap-2.5 px-2.5 h-9 rounded-md',
                      'transition-[background,color] duration-150 ease-out press-shrink',
                      isActive
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
                    )
                  }
                  style={({ isActive }) =>
                    isActive
                      ? {
                          background: `color-mix(in oklab, ${accent} 18%, transparent)`,
                        }
                      : undefined
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full animate-fade-in"
                          style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
                        />
                      )}
                      <Icon
                        size={15}
                        aria-hidden="true"
                        className={clsx(
                          'shrink-0 transition-colors duration-150',
                          isActive ? '' : 'group-hover/nav:text-[var(--color-text-primary)]',
                        )}
                        style={isActive ? { color: accent } : undefined}
                      />
                      <span
                        className={clsx(
                          'text-body-sm font-medium truncate transition-colors',
                          isActive && 'text-[var(--color-text-primary)]',
                        )}
                        style={labelStyle}
                      >
                        {label}
                      </span>
                      {to === '/inbox' && unreadCount > 0 && (
                        <span
                          className="ml-auto text-micro font-bold text-white bg-[var(--color-status-blocked)] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center tabular-nums animate-fade-in"
                          style={{ display: expanded ? 'inline-flex' : 'none' }}
                          aria-label={`${unreadCount} unread`}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )
              return permission ? (
                <PermissionGate key={to} permission={permission} fallback={null}>
                  {link}
                </PermissionGate>
              ) : (
                <Fragment key={to}>{link}</Fragment>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 px-1.5 pb-2 mt-2 border-t border-[var(--color-glass-border)] pt-2">
        <PermissionGate permission="settings.*">
          <NavLink
            to="/settings"
            aria-label="Settings"
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-2.5 h-9 rounded-md',
                'transition-[background,color] duration-150 ease-out press-shrink',
                isActive
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 w-0.5 h-5 rounded-full bg-[var(--color-accent)]"
                    style={{ boxShadow: '0 0 8px var(--color-accent)' }}
                  />
                )}
                <Settings
                  size={15}
                  className="shrink-0"
                  style={isActive ? { color: 'var(--color-accent-text)' } : undefined}
                  aria-hidden="true"
                />
                <span className="text-body-sm font-medium truncate" style={labelStyle}>
                  Settings
                </span>
              </>
            )}
          </NavLink>
        </PermissionGate>

        <button
          onClick={() => navigate('/settings/profile')}
          title={collapsed ? (user?.name ?? 'Profile') : undefined}
          aria-label={user?.name ?? 'Profile'}
          className="flex items-center gap-2.5 px-2.5 h-9 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150 w-full"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {user?.name?.[0] ?? 'U'}
            </div>
          )}
          <span className="text-body-sm truncate flex-1 text-left" style={labelStyle}>
            {user?.name ?? 'Profile'}
          </span>
        </button>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex items-center gap-2.5 px-2.5 h-9 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150 w-full"
        >
          {theme === 'dark'
            ? <Sun size={15} className="shrink-0" aria-hidden="true" />
            : <Moon size={15} className="shrink-0" aria-hidden="true" />
          }
          <span className="text-body-sm truncate flex-1 text-left" style={labelStyle}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>

        <button
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center gap-2.5 px-2.5 h-9 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150 w-full"
        >
          {collapsed
            ? <ChevronRight size={15} className="shrink-0" aria-hidden="true" />
            : <ChevronLeft  size={15} className="shrink-0" aria-hidden="true" />
          }
          <span className="text-body-sm truncate flex-1 text-left" style={labelStyle}>
            Collapse
          </span>
        </button>
      </div>
    </aside>
  )
}

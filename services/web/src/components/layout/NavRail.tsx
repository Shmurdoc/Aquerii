import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, FileText, Users, Settings, Bell,
  Inbox, Search, Wallet, Zap, ChevronLeft, ChevronRight, BarChart2, UserCheck, Video, Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
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

const NAV: NavItem[] = [
  { to: '/inbox',      icon: Inbox,      label: 'Inbox'      },
  { to: '/meetings',   icon: Video,      label: 'Meetings',   permission: 'meetings.*' },
  { to: '/employees',  icon: UserCheck,  label: 'Employees',  permission: 'employees.*' },
  { to: '/boards',     icon: LayoutGrid, label: 'Boards'     },
  { to: '/documents',  icon: FileText,   label: 'Documents'  },
  { to: '/crm',        icon: Users,      label: 'CRM',        permission: 'crm.*' },
  { to: '/ai/chat',    icon: Sparkles,   label: 'AI Chat'    },
  { to: '/erp',        icon: Wallet,     label: 'ERP',        permission: 'invoices.*' },
  { to: '/automation', icon: Zap,        label: 'Automation' },
  { to: '/reports',    icon: BarChart2,  label: 'Reports',    permission: 'reports.*' },
]

const STORAGE_KEY = 'sidebar:collapsed'

interface Props {
  onCmdOpen: () => void
}

export default function NavRail({ onCmdOpen }: Props) {
  const user        = useAuthStore(s => s.user)
  const workspace   = useAuthStore(s => s.workspace)
  const unreadCount = useNotificationStore(s => s.unreadCount)
  const navigate    = useNavigate()

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)) } catch {}
  }, [collapsed])

  const expanded = !collapsed

  return (
    <aside
      aria-label="Main navigation"
      style={{
        width: collapsed ? '52px' : '220px',
        transition: 'width var(--duration-300) var(--ease-spring)',
        background: 'var(--color-bg-base)',
        borderRight: '1px solid var(--color-glass-border)',
      }}
      className="flex flex-col shrink-0 z-10 overflow-hidden"
    >
      {/* Workspace avatar / name */}
      <button
        className="flex items-center gap-2.5 px-3 py-3 mb-1 hover:bg-[var(--color-bg-hover)] rounded-none transition-colors w-full text-left"
        aria-label={workspace?.name ?? 'Aquerii'}
        title={collapsed ? (workspace?.name ?? 'Aquerii') : undefined}
      >
        {workspace?.logo_url ? (
          <img
            src={workspace.logo_url}
            alt={workspace.name}
            className="h-7 w-7 rounded-lg object-contain bg-white/5 flex-shrink-0"
          />
        ) : (
          <InitialsAvatar
            name={workspace?.name ?? 'Aquerii'}
            color={workspace?.color ?? '#7c3aed'}
            size={28}
            shape="rounded"
          />
        )}
        <span
          className="text-sm font-semibold text-[var(--color-text-primary)] truncate"
          style={{
            opacity: expanded ? 1 : 0,
            width: expanded ? 'auto' : 0,
            overflow: 'hidden',
            transition: 'opacity var(--duration-200) var(--ease-out), width var(--duration-300) var(--ease-spring)',
            whiteSpace: 'nowrap',
          }}
        >
          {workspace?.name ?? 'Aquerii'}
        </span>
      </button>

      {/* Search */}
      <button
        onClick={onCmdOpen}
        title="Search (⌘K)"
        aria-label="Search (⌘K)"
        className="mx-1.5 mb-1 h-9 flex items-center gap-2.5 px-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <Search size={16} className="flex-shrink-0" />
        <span
          className="text-sm truncate"
          style={{
            opacity: expanded ? 1 : 0,
            width: expanded ? 'auto' : 0,
            overflow: 'hidden',
            transition: 'opacity var(--duration-200) var(--ease-out), width var(--duration-300) var(--ease-spring)',
            whiteSpace: 'nowrap',
          }}
        >
          Search…
        </span>
      </button>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-1.5 mt-1 overflow-y-auto" aria-label="App sections">
        {NAV.map(({ to, icon: Icon, label, permission }) => (
          <PermissionGate key={to} permission={permission ?? ''} fallback={null}>
            <NavLink
              to={to}
              aria-label={label}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                clsx(
                  'relative flex items-center gap-2.5 px-2 h-9 rounded-lg transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} aria-hidden="true" className="flex-shrink-0" />
                  <span
                    className="text-sm font-medium truncate"
                    style={{
                      opacity: expanded ? 1 : 0,
                      width: expanded ? 'auto' : 0,
                      overflow: 'hidden',
                      transition: 'opacity var(--duration-200) var(--ease-out), width var(--duration-300) var(--ease-spring)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                  {isActive && <span className="sr-only">(current)</span>}
                  {to === '/inbox' && unreadCount > 0 && (
                    <span
                      className="absolute bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none"
                      style={{ top: 4, left: collapsed ? 20 : 20 }}
                      aria-label={`${unreadCount} unread`}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </PermissionGate>
        ))}
      </nav>

      {/* Bottom: settings + user + collapse toggle */}
      <div className="flex flex-col gap-0.5 px-1.5 pb-2 mt-2">
        <PermissionGate permission="settings.*">
          <NavLink
            to="/settings"
            aria-label="Settings"
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-2 h-9 rounded-lg transition-colors',
                isActive
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Settings size={16} className="flex-shrink-0" aria-hidden="true" />
                <span
                  className="text-sm font-medium truncate"
                  style={{
                    opacity: expanded ? 1 : 0,
                    width: expanded ? 'auto' : 0,
                    overflow: 'hidden',
                    transition: 'opacity var(--duration-200) var(--ease-out), width var(--duration-300) var(--ease-spring)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Settings
                </span>
              </>
            )}
          </NavLink>
        </PermissionGate>

        {/* User profile */}
        <button
          onClick={() => navigate('/settings/profile')}
          title={collapsed ? (user?.name ?? 'Profile') : undefined}
          aria-label={user?.name ?? 'Profile'}
          className="flex items-center gap-2.5 px-2 h-9 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors w-full"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {user?.name?.[0] ?? 'U'}
            </div>
          )}
          <span
            className="text-sm truncate"
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? 'auto' : 0,
              overflow: 'hidden',
              transition: 'opacity var(--duration-200) var(--ease-out), width var(--duration-300) var(--ease-spring)',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.name ?? 'Profile'}
          </span>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center gap-2.5 px-2 h-9 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors w-full"
        >
          {collapsed
            ? <ChevronRight size={16} className="flex-shrink-0" aria-hidden="true" />
            : <ChevronLeft  size={16} className="flex-shrink-0" aria-hidden="true" />
          }
          <span
            className="text-sm truncate"
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? 'auto' : 0,
              overflow: 'hidden',
              transition: 'opacity var(--duration-200) var(--ease-out), width var(--duration-300) var(--ease-spring)',
              whiteSpace: 'nowrap',
            }}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  )
}

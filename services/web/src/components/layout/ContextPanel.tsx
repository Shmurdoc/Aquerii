import { useLocation, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import clsx from 'clsx'
import { staggerStyle } from '@/lib/motion'

const SECTIONS: Record<string, { label: string; items: { to: string; label: string }[] }> = {
  '/dashboard': {
    label: 'Dashboard',
    items: [
      { to: '/dashboard', label: 'Overview' },
    ],
  },
  '/boards': {
    label: 'Work',
    items: [
      { to: '/boards', label: 'All Boards' },
    ],
  },
  '/documents': {
    label: 'Documents',
    items: [
      { to: '/documents',       label: 'Notes' },
      { to: '/documents/files', label: 'Files' },
    ],
  },
  '/crm': {
    label: 'CRM',
    items: [
      { to: '/crm',                label: 'Deals'            },
      { to: '/crm/contacts',       label: 'Contacts'         },
      { to: '/crm/leads',          label: 'Leads'            },
      { to: '/crm/forecast',       label: 'Forecast'         },
      { to: '/crm/quotas',         label: 'Quotas'           },
      { to: '/crm/sequences',      label: 'Sequences'        },
      { to: '/crm/products',       label: 'Products'         },
      { to: '/crm/quotes',         label: 'Quotes'           },
      { to: '/crm/calendar-sync',  label: 'Calendar Sync'    },
      { to: '/crm/approval-rules', label: 'Approval Rules'   },
      { to: '/crm/deal-approvals', label: 'Deal Approvals'   },
      { to: '/crm/automation-rules', label: 'Automation Rules' },
    ],
  },
  '/support': {
    label: 'Support',
    items: [
      { to: '/support/tickets',        label: 'Tickets'        },
      { to: '/support/knowledge-base', label: 'Knowledge Base' },
      { to: '/support/slas',           label: 'SLAs'           },
    ],
  },
  '/settings': {
    label: 'Settings',
    items: [
      { to: '/settings',         label: 'General'   },
      { to: '/settings/profile', label: 'Profile'   },
      { to: '/settings/team',    label: 'Team'      },
      { to: '/settings/billing', label: 'Billing'   },
    ],
  },
  '/inbox': {
    label: 'Inbox',
    items: [
      { to: '/inbox', label: 'All Notifications' },
    ],
  },
  '/automation': {
    label: 'Automation',
    items: [
      { to: '/automation', label: 'Rules' },
    ],
  },
  '/erp': {
    label: 'ERP',
    items: [],
  },
}

const PANEL_SECTIONS = Object.keys(SECTIONS)

interface Props {
  onNavigate?: () => void
}

export default function ContextPanel({ onNavigate }: Props) {
  const { pathname } = useLocation()
  const workspace    = useAuthStore(s => s.workspace)

  const section = PANEL_SECTIONS.find(p => pathname === p || pathname.startsWith(p + '/'))
  if (!section) return null

  const { label, items } = SECTIONS[section]

  return (
    <aside
      className="w-52 flex flex-col shrink-0 z-[var(--z-raised)] bg-[var(--color-bg-base)] border-r border-[var(--color-glass-border)]"
      aria-label={`${label} sub-navigation`}
    >
      <div className="px-4 py-3.5 border-b border-[var(--color-glass-border)]">
        <p className="text-micro font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          {label}
        </p>
        {section === '/boards' && workspace && (
          <p className="text-label text-[var(--color-text-secondary)] mt-0.5 truncate">
            {workspace.name}
          </p>
        )}
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto" aria-label={label}>
        {items.map(({ to, label: itemLabel }, idx) => (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onNavigate}
            aria-label={itemLabel}
            style={staggerStyle(idx)}
            className={({ isActive }) =>
              clsx(
                'stagger-item relative block px-3 py-1.5 rounded-md text-body-sm',
                'transition-[background,color,transform] duration-150 ease-out press-shrink',
                isActive
                  ? 'text-[var(--color-text-primary)] font-medium'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[var(--color-accent)]"
                    style={{ boxShadow: '0 0 8px var(--color-accent)' }}
                  />
                )}
                <span
                  className={clsx(
                    'absolute inset-0 rounded-md -z-10 transition-opacity duration-150',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                  style={{ background: 'var(--color-accent-light)' }}
                  aria-hidden="true"
                />
                <span className="relative">{itemLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

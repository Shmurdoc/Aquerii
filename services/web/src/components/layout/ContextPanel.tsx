import { useLocation, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import clsx from 'clsx'

// Sub-nav definitions per top-level section
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
      { to: '/crm',             label: 'Deals'      },
      { to: '/crm/contacts',    label: 'Contacts'   },
      { to: '/crm/leads',       label: 'Leads'      },
      { to: '/crm/forecast',    label: 'Forecast'   },
      { to: '/crm/quotas',      label: 'Quotas'     },
      { to: '/crm/sequences',   label: 'Sequences'  },
    ],
  },
  '/support': {
    label: 'Support',
    items: [
      { to: '/support/tickets',        label: 'Tickets'   },
      { to: '/support/knowledge-base', label: 'Knowledge Base' },
      { to: '/support/slas',           label: 'SLAs'      },
    ],
  },
  '/marketing': {
    label: 'Marketing',
    items: [
      { to: '/marketing/campaigns',        label: 'Campaigns' },
      { to: '/marketing/email-templates',  label: 'Email Templates' },
      { to: '/marketing/segments',         label: 'Segments' },
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
    items: [
      { to: '/erp/invoicing',  label: 'Invoicing'  },
      { to: '/erp/purchasing', label: 'Purchasing' },
      { to: '/erp/sales',      label: 'Sales'      },
      { to: '/erp/inventory',  label: 'Inventory'  },
      { to: '/erp/accounting', label: 'Accounting' },
    ],
  },
}

// Sections that show the context panel
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
      style={{ background: 'var(--color-bg-base)', borderRight: '1px solid var(--color-glass-border)' }}
      className="w-48 flex flex-col shrink-0"
      aria-label={`${label} sub-navigation`}
    >
      {/* Section title */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </p>
        {section === '/boards' && workspace && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{workspace.name}</p>
        )}
      </div>

      {/* Sub-nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto" aria-label={label}>
        {items.map(({ to, label: itemLabel }) => (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onNavigate}
            aria-label={itemLabel}
            className={({ isActive }) =>
              clsx(
                'block px-3 py-1.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)] font-medium'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
              )
            }
          >
            {itemLabel}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

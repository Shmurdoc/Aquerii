import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  Video,
  FileText,
  CheckSquare,
  Ticket,
} from 'lucide-react'

interface QuickAction {
  label: string
  icon: typeof LayoutGrid
  color: string
  hoverColor: string
  route: string
}

const ACTIONS: QuickAction[] = [
  {
    label: 'New Board',
    icon: LayoutGrid,
    color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25',
    hoverColor: 'hover:border-indigo-500/50',
    route: '/boards',
  },
  {
    label: 'New Meeting',
    icon: Video,
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
    hoverColor: 'hover:border-emerald-500/50',
    route: '/meetings',
  },
  {
    label: 'New Document',
    icon: FileText,
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25',
    hoverColor: 'hover:border-blue-500/50',
    route: '/documents',
  },
  {
    label: 'New Task',
    icon: CheckSquare,
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
    hoverColor: 'hover:border-amber-500/50',
    route: '/boards',
  },
  {
    label: 'New Ticket',
    icon: Ticket,
    color: 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25',
    hoverColor: 'hover:border-rose-500/50',
    route: '/support/tickets',
  },
]

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        background: 'var(--color-glass-bg)',
        borderColor: 'var(--color-glass-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wider px-1 mb-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Quick Actions
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.route)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border min-w-[88px] shrink-0 transition-all ${action.color} ${action.hoverColor}`}
            >
              <Icon size={18} />
              <span className="text-[11px] font-medium whitespace-nowrap">{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

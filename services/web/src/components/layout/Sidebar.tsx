import { NavLink } from 'react-router-dom'
import { LayoutGrid, FileText, Users, Settings, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import clsx from 'clsx'

const NAV = [
  { to: '/boards',    icon: LayoutGrid, label: 'Boards'    },
  { to: '/documents', icon: FileText,   label: 'Documents' },
  { to: '/crm',       icon: Users,      label: 'CRM'       },
  { to: '/settings',  icon: Settings,   label: 'Settings'  },
]

export default function Sidebar() {
  const workspace = useAuthStore(s => s.workspace)

  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      {/* Workspace switcher */}
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          {workspace?.name?.[0] ?? 'A'}
        </div>
        <span className="flex-1 text-sm font-medium text-gray-100 truncate">{workspace?.name ?? 'Aquerii'}</span>
        <ChevronRight size={14} className="text-gray-500" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

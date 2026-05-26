import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutGrid, FileText, Users, Settings, ChevronsUpDown, Check, Plus, Mail } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import clsx from 'clsx'

// Reordered nav for better discoverability: primary workflows first
const NAV = [
  { to: '/boards',    icon: LayoutGrid, label: 'Boards'    },
  { to: '/email',     icon: Mail,       label: 'Email'     },
  { to: '/documents', icon: FileText,   label: 'Documents' },
  { to: '/crm',       icon: Users,      label: 'CRM'       },
  { to: '/settings',  icon: Settings,   label: 'Settings'  },
]

export default function Sidebar() {
  const workspace    = useAuthStore(s => s.workspace)
  const setWorkspace = useAuthStore(s => s.setWorkspace)
  const user         = useAuthStore(s => s.user)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces')
      return res.data.data as Array<{ id: string; name: string; slug: string; plan: string }>
    },
    enabled: !!user,
  })

  const handleSwitch = (ws: { id: string; name: string; slug: string; plan: string }) => {
    setWorkspace(ws)
    setOpen(false)
    // Reload to flush all cached queries for the previous workspace
    window.location.href = '/boards'
  }

  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      {/* Workspace switcher */}
      <div ref={ref} className="relative px-4 py-4 border-b border-gray-800">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-2 hover:bg-gray-800 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {workspace?.name?.[0] ?? 'A'}
          </div>
          <span className="flex-1 text-sm font-medium text-gray-100 truncate text-left">
            {workspace?.name ?? 'Aquerii'}
          </span>
          <ChevronsUpDown size={13} className="text-gray-500 shrink-0" />
        </button>

        {open && (
          <div className="absolute top-full left-3 right-3 z-50 mt-1 bg-gray-900 border border-gray-700
                          rounded-xl shadow-2xl py-1 overflow-hidden">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws)}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                  ws.id === workspace?.id
                    ? 'text-indigo-400 bg-indigo-600/10'
                    : 'text-gray-300 hover:bg-gray-800'
                )}
              >
                <div className="w-5 h-5 rounded-md bg-indigo-600/70 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {ws.name[0]}
                </div>
                <span className="flex-1 truncate text-left">{ws.name}</span>
                {ws.id === workspace?.id && <Check size={12} className="text-indigo-400 shrink-0" />}
              </button>
            ))}
            <div className="border-t border-gray-800 mt-1 pt-1">
              <button
                onClick={() => { setOpen(false); window.location.href = '/workspaces/new' }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <Plus size={13} /> New workspace
              </button>
            </div>
          </div>
        )}
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

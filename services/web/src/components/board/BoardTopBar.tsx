import type { Board } from '@/hooks/useBoards'
import { LayoutGrid, Table2, Calendar, BarChart2 } from 'lucide-react'
import clsx from 'clsx'

const VIEWS = [
  { id: 'kanban',   icon: LayoutGrid, label: 'Kanban'   },
  { id: 'table',    icon: Table2,     label: 'Table'    },
  { id: 'calendar', icon: Calendar,   label: 'Calendar' },
  { id: 'chart',    icon: BarChart2,  label: 'Chart'    },
]

interface Props {
  board: Board
}

export default function BoardTopBar({ board }: Props) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 bg-gray-950">
      {/* Board name */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: board.color ?? '#6366f1' }}
      >
        {board.icon ?? board.name[0]}
      </div>
      <h1 className="text-sm font-semibold text-white truncate flex-1">{board.name}</h1>

      {/* View switcher */}
      <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5">
        {VIEWS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              board.default_view === id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

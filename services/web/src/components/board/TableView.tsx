import { useState } from 'react'
import type { Board } from '@/hooks/useBoards'
import type { Item } from '@/hooks/useItems'
import { format } from 'date-fns'
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import ItemDetailModal from './ItemDetailModal'

interface Props {
  board: Board
  items: Item[]
  boardId: string
}

type SortableKey = 'position' | 'title' | 'assignees' | 'due_date' | 'priority' | 'status'

type SortDir = 'asc' | 'desc'

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

export default function TableView({ board, items, boardId }: Props) {
  const [sortKey,    setSortKey]    = useState<SortableKey>('position')
  const [sortDir,    setSortDir]    = useState<SortDir>('asc')
  const [selected,   setSelected]   = useState<Item | null>(null)
  const [collapsed,  setCollapsed]  = useState<Set<string>>(new Set())

  const groups = [...board.groups].sort((a, b) => a.position - b.position)

  const itemsByGroup = (gId: string) => {
    let filtered = items.filter(i => i.group_id === gId && !i.parent_id)
    return filtered.sort((a, b) => {
      const rawAv = a[sortKey]
      const rawBv = b[sortKey]

      if (sortKey === 'priority') {
        const pv = (rawAv ?? '') as string
        const pv2 = (rawBv ?? '') as string
        const av = PRIORITY_ORDER[pv] ?? 99
        const bv = PRIORITY_ORDER[pv2] ?? 99
        return sortDir === 'asc' ? av - bv : bv - av
      }

      if (rawAv == null) return 1
      if (rawBv == null) return -1
      const cmp = rawAv < rawBv ? -1 : rawAv > rawBv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  const toggleSort = (key: SortableKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleGroup = (gId: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(gId) ? next.delete(gId) : next.add(gId)
      return next
    })

  const SortIcon = ({ col }: { col: SortableKey }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
  }

  const cols: { key: SortableKey; label: string; width: string }[] = [
    { key: 'title',    label: 'Title',    width: 'flex-1 min-w-[200px]' },
    { key: 'assignees',label: 'Assignee', width: 'w-32'                 },
    { key: 'due_date', label: 'Due Date', width: 'w-28'                 },
    { key: 'priority', label: 'Priority', width: 'w-24'                 },
    { key: 'status',   label: 'Status',   width: 'w-28'                 },
  ]

  return (
    <>
      <div className="flex flex-col h-full overflow-auto">
        {/* Header row */}
        <div className="flex items-center gap-px px-6 py-2 border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
          <div className="w-6" />
          {cols.map(c => (
            <button
              key={c.key}
              onClick={() => toggleSort(c.key)}
              className={clsx(
                'flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-300 px-2 py-1 select-none',
                c.width
              )}
            >
              {c.label}
              <SortIcon col={c.key} />
            </button>
          ))}
        </div>

        {/* Groups */}
        {groups.map(group => {
          const groupItems = itemsByGroup(group.id)
          const isOpen     = !collapsed.has(group.id)

          return (
            <div key={group.id}>
              {/* Group row */}
              <div
                className="flex items-center gap-2 px-6 py-2 bg-gray-900/60 border-b border-gray-800 cursor-pointer hover:bg-gray-800/60 transition-colors"
                onClick={() => toggleGroup(group.id)}
              >
                <ChevronRight
                  size={13}
                  className={clsx('text-gray-500 transition-transform', isOpen && 'rotate-90')}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color ?? '#6366f1' }}
                />
                <span className="text-xs font-semibold text-gray-300">{group.name}</span>
                <span className="text-xs text-gray-600 ml-1">({groupItems.length})</span>
              </div>

              {/* Items */}
              {isOpen && groupItems.map(item => (
                <TableRow
                  key={item.id}
                  item={item}
                  boardId={boardId}
                  board={board}
                  onClick={() => setSelected(item)}
                />
              ))}
            </div>
          )
        })}
      </div>

      {selected && (
        <ItemDetailModal
          item={selected}
          boardId={boardId}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

// ── Single row ─────────────────────────────────────────────────────────────────
function TableRow({
  item, boardId, board, onClick,
}: {
  item: Item; boardId: string; board: Board; onClick: () => void
}) {
  const PRIORITY_COLOR: Record<string, string> = {
    critical: 'text-red-400',
    high:     'text-orange-400',
    medium:   'text-yellow-400',
    low:      'text-gray-500',
  }

  const statusGroup = board.groups.find(g => g.id === item.group_id)
  const isOverdue   = item.due_date && new Date(item.due_date) < new Date()

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-px px-6 py-0 border-b border-gray-800/60 hover:bg-gray-800/30 cursor-pointer group transition-colors"
    >
      <div className="w-6" />

      {/* Title */}
      <div className="flex-1 min-w-[200px] px-2 py-2.5 text-sm text-gray-200 group-hover:text-white truncate">
        {item.title}
      </div>

      {/* Assignees */}
      <div className="w-32 px-2 py-2.5">
        {item.assignees?.length > 0 ? (
          <div className="flex -space-x-1">
            {item.assignees.slice(0, 3).map((a) => (
              a.avatar_url
                ? <img key={a.id} src={a.avatar_url} className="w-5 h-5 rounded-full border border-gray-800" alt={a.name} />
                : <div key={a.id} className="w-5 h-5 rounded-full bg-indigo-600 border border-gray-800 flex items-center justify-center text-white text-[9px] font-bold">{a.name[0]}</div>
            ))}
            {item.assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-gray-700 border border-gray-800 flex items-center justify-center text-gray-400 text-[9px]">
                +{item.assignees.length - 3}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-700">—</span>
        )}
      </div>

      {/* Due date */}
      <div className={clsx('w-28 px-2 py-2.5 text-xs', isOverdue ? 'text-red-400' : 'text-gray-500')}>
        {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '—'}
      </div>

      {/* Priority */}
      <div className={clsx('w-24 px-2 py-2.5 text-xs font-medium capitalize', PRIORITY_COLOR[item.priority ?? ''] ?? 'text-gray-600')}>
        {item.priority ?? '—'}
      </div>

      {/* Status (group name) */}
      <div className="w-28 px-2 py-2.5">
        {statusGroup ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: (statusGroup.color ?? '#6366f1') + '20',
              color:           statusGroup.color ?? '#6366f1',
            }}
          >
            {statusGroup.name}
          </span>
        ) : (
          <span className="text-xs text-gray-700">—</span>
        )}
      </div>
    </div>
  )
}

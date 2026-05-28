import { useState, useRef, useMemo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Board } from '@/hooks/useBoards'
import type { Item } from '@/hooks/useItems'
import { useMoveItem } from '@/hooks/useItems'
import { format } from 'date-fns'
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import ItemDetailModal from './ItemDetailModal'

interface Props {
  board: Board
  items: Item[]
  boardId: string
}

type SortDir = 'asc' | 'desc'
type Row =
  | { type: 'header'; groupId: string; name: string; color: string | null; count: number }
  | { type: 'item'; item: Item }

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

const HEADER_HEIGHT = 34
const ROW_HEIGHT = 38
const OVERSCAN = 5

export default function TableView({ board, items, boardId }: Props) {
  const [sortKey,    setSortKey]    = useState<string>('position')
  const [sortDir,    setSortDir]    = useState<SortDir>('asc')
  const [selected,   setSelected]   = useState<Item | null>(null)
  const [collapsed,  setCollapsed]  = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(
    () => [...board.groups].sort((a, b) => a.position - b.position),
    [board.groups]
  )

  const itemsByGroup = useCallback(
    (gId: string) => {
      let filtered = items.filter(i => i.group_id === gId && !i.parent_id)
      return filtered.sort((a, b) => {
        const key = sortKey as keyof typeof a
        let av: unknown = a[key]
        let bv: unknown = b[key]

        if (sortKey === 'priority') {
          av = PRIORITY_ORDER[av as string] ?? 99
          bv = PRIORITY_ORDER[bv as string] ?? 99
        }
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    },
    [items, sortKey, sortDir]
  )

  const rows = useMemo<Row[]>(() => {
    const r: Row[] = []
    for (const g of groups) {
      const header: Row = { type: 'header', groupId: g.id, name: g.name, color: g.color, count: 0 }
      if (!collapsed.has(g.id)) {
        const groupItems = itemsByGroup(g.id)
        header.count = groupItems.length
        r.push(header)
        for (const item of groupItems) {
          r.push({ type: 'item', item })
        }
      } else {
        header.count = items.filter(i => i.group_id === g.id && !i.parent_id).length
        r.push(header)
      }
    }
    return r
  }, [groups, collapsed, itemsByGroup, items])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => rows[index].type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT,
    overscan: OVERSCAN,
  })

  const toggleSort = (key: string) => {
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

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
  }

  const cols: { key: string; label: string; width: string }[] = [
    { key: 'title',    label: 'Title',    width: 'flex-1 min-w-[200px]' },
    { key: 'assignees',label: 'Assignee', width: 'w-32'                 },
    { key: 'due_date', label: 'Due Date', width: 'w-28'                 },
    { key: 'priority', label: 'Priority', width: 'w-24'                 },
    { key: 'status',   label: 'Status',   width: 'w-28'                 },
  ]

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header row */}
        <div className="flex items-center gap-px px-6 py-2 border-b border-gray-800 bg-gray-950 shrink-0">
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

        {/* Virtualized body */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              if (row.type === 'header') {
                const isOpen = !collapsed.has(row.groupId)
                return (
                  <div
                    key={row.groupId}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <GroupHeader
                      name={row.name}
                      color={row.color}
                      count={row.count}
                      isOpen={isOpen}
                      onToggle={() => toggleGroup(row.groupId)}
                    />
                  </div>
                )
              }
              return (
                <div
                  key={row.item.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TableRow
                    item={row.item}
                    boardId={boardId}
                    board={board}
                    onClick={() => setSelected(row.item)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ItemDetailModal
        itemId={selected?.id ?? ''}
        boardId={boardId}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}

function GroupHeader({
  name, color, count, isOpen, onToggle,
}: {
  name: string; color: string | null; count: number; isOpen: boolean; onToggle: () => void
}) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-2 px-6 py-[7px] bg-gray-900/60 border-b border-gray-800 cursor-pointer hover:bg-gray-800/60 transition-colors h-full"
    >
      <ChevronRight
        size={13}
        className={clsx('text-gray-500 transition-transform shrink-0', isOpen && 'rotate-90')}
      />
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color ?? '#6366f1' }}
      />
      <span className="text-xs font-semibold text-gray-300">{name}</span>
      <span className="text-xs text-gray-600 ml-1">({count})</span>
    </div>
  )
}

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
      className="flex items-center gap-px px-6 border-b border-gray-800/60 hover:bg-gray-800/30 cursor-pointer group transition-colors h-full"
    >
      <div className="w-6 shrink-0" />

      {/* Title */}
      <div className="flex-1 min-w-[200px] px-2 text-sm text-gray-200 group-hover:text-white truncate">
        {item.title}
      </div>

      {/* Assignees */}
      <div className="w-32 shrink-0 px-2">
        {item.assignees?.length > 0 ? (
          <div className="flex -space-x-1">
            {item.assignees.slice(0, 3).map(a => (
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
      <div className={clsx('w-28 shrink-0 px-2 text-xs', isOverdue ? 'text-red-400' : 'text-gray-500')}>
        {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '—'}
      </div>

      {/* Priority */}
      <div className={clsx('w-24 shrink-0 px-2 text-xs font-medium capitalize', PRIORITY_COLOR[item.priority ?? ''] ?? 'text-gray-600')}>
        {item.priority ?? '—'}
      </div>

      {/* Status (group name) */}
      <div className="w-28 shrink-0 px-2">
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

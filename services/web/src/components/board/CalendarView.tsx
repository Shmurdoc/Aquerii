import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Board } from '@/hooks/useBoards'
import type { Item } from '@/hooks/useItems'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths,
  isSameMonth, isToday, format,
} from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import clsx from 'clsx'
import ItemDetailModal from './ItemDetailModal'

interface Props {
  board: Board
  items: Item[]
  boardId: string
}

type OverflowPos = { top: number; left: number }

export default function CalendarView({ board, items, boardId }: Props) {
  const [current,     setCurrent]     = useState(new Date())
  const [selected,    setSelected]    = useState<Item | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [overflowPos, setOverflowPos] = useState<OverflowPos | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Close popover on outside click / Esc
  useEffect(() => {
    if (!expandedDay) return
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setExpandedDay(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedDay(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [expandedDay])

  // Recompute popover position whenever it opens, on resize, or on scroll.
  useLayoutEffect(() => {
    if (!expandedDay) {
      setOverflowPos(null)
      return
    }
    const compute = () => {
      const cell = cellRefs.current[expandedDay]
      if (!cell) return
      const r = cell.getBoundingClientRect()
      const POPOVER_W = 224
      const GAP = 8
      const margin = 8
      // Flip left if the day is on the right half of the viewport, OR if
      // opening rightward would push the popover past the viewport edge.
      const wouldOverflowRight = r.right + GAP + POPOVER_W + margin > window.innerWidth
      const cellIsRightHalf    = r.left + r.width / 2 > window.innerWidth / 2
      const left = wouldOverflowRight || cellIsRightHalf
        ? Math.max(margin, r.left - GAP - POPOVER_W)
        : r.right + GAP
      const top = Math.max(margin, r.top)
      setOverflowPos({ top, left })
    }
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, true)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, true)
    }
  }, [expandedDay])

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })

  // Build calendar grid: array of weeks, each an array of 7 days
  const weeks: Date[][] = []
  let day = gridStart
  while (day <= gridEnd) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(day)
      day = addDays(day, 1)
    }
    weeks.push(week)
  }

  // Items with a due_date → index by date string YYYY-MM-DD
  const itemsByDate = items.reduce<Record<string, Item[]>>((acc, item) => {
    if (!item.due_date) return acc
    const key = item.due_date.slice(0, 10)
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})

  const groupColor = (item: Item) =>
    board.groups.find(g => g.id === item.group_id)?.color ?? '#6366f1'

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <>
      <div className="flex flex-col h-full px-6 py-4">
        {/* Nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-semibold text-white">
            {format(current, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-xs text-gray-600 font-medium text-center py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 grid grid-rows-[repeat(auto-fill,minmax(0,1fr))] gap-px bg-gray-800 rounded-xl overflow-hidden border border-gray-800">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-px">
              {week.map((d, di) => {
                const key      = format(d, 'yyyy-MM-dd')
                const dayItems = itemsByDate[key] ?? []
                const outside  = !isSameMonth(d, current)
                const today    = isToday(d)
                const isOpen   = expandedDay === key

                return (
                  <div
                    key={di}
                    ref={(el) => { cellRefs.current[key] = el }}
                    className={clsx(
                      'bg-gray-950 p-1.5 min-h-[90px] relative',
                      outside && 'opacity-40',
                      isOpen && 'z-30'
                    )}
                  >
                    {/* Date number */}
                    <div className={clsx(
                      'w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full mb-1 ml-auto',
                      today ? 'bg-indigo-600 text-white' : 'text-gray-400'
                    )}>
                      {format(d, 'd')}
                    </div>

                    {/* Item chips */}
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 3).map(item => (
                        <button
                          key={item.id}
                          onClick={() => setSelected(item)}
                          className="w-full text-left truncate text-[11px] px-1.5 py-0.5 rounded font-medium transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: groupColor(item) + '30',
                            color:           groupColor(item),
                          }}
                        >
                          {item.title}
                        </button>
                      ))}
                      {dayItems.length > 3 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedDay(isOpen ? null : key)
                          }}
                          className={clsx(
                            'text-[10px] px-1 transition-colors w-full text-left',
                            isOpen ? 'text-indigo-300' : 'text-gray-500 hover:text-indigo-400'
                          )}
                        >
                          {isOpen ? '− hide' : `+${dayItems.length - 3} more`}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {expandedDay && overflowPos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Day overflow"
          className="fixed z-[1000] w-56 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-2 animate-fade-in"
          style={{ top: overflowPos.top, left: overflowPos.left }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-1 pb-1.5 mb-1 border-b border-gray-800">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              {(() => {
                const d = new Date(expandedDay)
                return Number.isNaN(d.getTime()) ? 'Remaining items' : `${format(d, 'EEE, MMM d')} — ${(() => {
                  const arr = itemsByDate[expandedDay] ?? []
                  return arr.length
                })()} items`
              })()}
            </p>
            <button
              onClick={() => setExpandedDay(null)}
              className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X size={12} />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {(itemsByDate[expandedDay] ?? []).slice(3).map(item => (
              <button
                key={item.id}
                onClick={() => { setSelected(item); setExpandedDay(null) }}
                className="w-full text-left truncate text-[11px] px-2 py-1.5 rounded font-medium transition-all hover:translate-x-0.5"
                style={{
                  backgroundColor: groupColor(item) + '25',
                  color:           groupColor(item),
                  border:          `1px solid ${groupColor(item)}40`,
                }}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      <ItemDetailModal
        itemId={selected?.id ?? ''}
        boardId={boardId}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}

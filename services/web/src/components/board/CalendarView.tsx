import { useState } from 'react'
import type { Board } from '@/hooks/useBoards'
import type { Item } from '@/hooks/useItems'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths,
  isSameMonth, isSameDay, isToday, format, parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import ItemDetailModal from './ItemDetailModal'

interface Props {
  board: Board
  items: Item[]
  boardId: string
}

export default function CalendarView({ board, items, boardId }: Props) {
  const [current,  setCurrent]  = useState(new Date())
  const [selected, setSelected] = useState<Item | null>(null)

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

                return (
                  <div
                    key={di}
                    className={clsx(
                      'bg-gray-950 p-1.5 min-h-[90px]',
                      outside && 'opacity-40'
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
                        <p className="text-[10px] text-gray-600 px-1">
                          +{dayItems.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
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

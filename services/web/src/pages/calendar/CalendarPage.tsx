import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCalendarItems, type CalendarItem } from '@/hooks/useCalendarItems'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, format, parseISO, isSameMonth, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, List, Loader2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-gray-500',
}

type ViewMode = 'month' | 'agenda'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function groupByDate(items: CalendarItem[]): Record<string, CalendarItem[]> {
  const map: Record<string, CalendarItem[]> = {}
  for (const item of items) {
    if (!item.due_date) continue
    const key = item.due_date.slice(0, 10)
    ;(map[key] ??= []).push(item)
  }
  return map
}

function sortedDates(map: Record<string, CalendarItem[]>): string[] {
  return Object.keys(map).sort()
}

function MonthView({ items, onItemClick }: { items: CalendarItem[]; onItemClick: (id: string) => void }) {
  const [current, setCurrent] = useState(new Date())
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setExpandedDay(null)
      }
    }
    if (expandedDay) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expandedDay])

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

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

  const itemsByDate = groupByDate(items)

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {format(current, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => setCurrent(new Date())}
          className="text-xs px-2 py-1 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-xs text-[var(--color-text-muted)] font-medium text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div
        className="flex-1 grid grid-rows-[repeat(auto-fill,minmax(0,1fr))] gap-px rounded-xl overflow-hidden border"
        style={{ borderColor: 'var(--color-glass-border)' }}
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px" style={{ background: 'var(--color-glass-border)' }}>
            {week.map((d, di) => {
              const key = format(d, 'yyyy-MM-dd')
              const dayItems = itemsByDate[key] ?? []
              const outside = !isSameMonth(d, current)
              const today = isToday(d)

              return (
                <div
                  key={di}
                  className="p-1.5 min-h-[90px] relative"
                  style={{
                    background: outside ? 'var(--color-bg-surface)' : 'var(--color-bg-base)',
                    opacity: outside ? 0.5 : undefined,
                  }}
                >
                  <div
                    className={clsx(
                      'w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full mb-1 ml-auto',
                      today
                        ? 'text-white'
                        : 'text-[var(--color-text-muted)]',
                    )}
                    style={today ? { background: 'var(--color-accent)' } : undefined}
                  >
                    {format(d, 'd')}
                  </div>

                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => (
                      <button
                        key={item.id}
                        onClick={() => onItemClick(item.id)}
                        className="w-full text-left truncate text-[11px] px-1.5 py-0.5 rounded font-medium transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: item.board_color ? `${item.board_color}30` : 'rgba(99,102,241,0.2)',
                          color: item.board_color ?? '#818cf8',
                        }}
                      >
                        {item.title}
                      </button>
                    ))}
                    {dayItems.length > 3 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedDay(expandedDay === key ? null : key) }}
                        className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent-text)] px-1 transition-colors w-full text-left"
                      >
                        +{dayItems.length - 3} more
                      </button>
                    )}
                  </div>

                  {expandedDay === key && (
                    <div
                      ref={popoverRef}
                      className="absolute z-50 top-0 left-full ml-1 w-52 border rounded-xl shadow-2xl p-2 space-y-0.5"
                      style={{
                        background: 'var(--color-bg-elevated)',
                        borderColor: 'var(--color-glass-border)',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-[10px] text-[var(--color-text-muted)] font-medium px-1 pb-1">
                        {format(d, 'MMM d')} — remaining items
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {dayItems.slice(3).map(item => (
                          <button
                            key={item.id}
                            onClick={() => { onItemClick(item.id); setExpandedDay(null) }}
                            className="w-full text-left truncate text-[11px] px-1.5 py-1 rounded font-medium transition-opacity hover:opacity-80"
                            style={{
                              backgroundColor: item.board_color ? `${item.board_color}30` : 'rgba(99,102,241,0.2)',
                              color: item.board_color ?? '#818cf8',
                            }}
                          >
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function AgendaView({ items, onItemClick }: { items: CalendarItem[]; onItemClick: (id: string) => void }) {
  const byDate = groupByDate(items)
  const dates = sortedDates(byDate)

  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
        <CalendarDays size={32} className="opacity-40 mb-2" />
        <p className="text-sm">No items with due dates</p>
      </div>
    )
  }

  const now = new Date()

  return (
    <div className="space-y-4 flex-1 overflow-y-auto pr-1">
      {dates.map(dateStr => {
        const date = parseISO(dateStr)
        const dayItems = byDate[dateStr]
        const isPast = date < now && !isToday(date)

        return (
          <div key={dateStr}>
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span
                className={clsx(
                  'text-xs font-semibold',
                  isPast ? 'text-red-400' : 'text-[var(--color-text-secondary)]',
                )}
              >
                {format(date, 'EEEE, MMM d, yyyy')}
              </span>
              {isPast && <span className="text-[10px] text-red-400/70">overdue</span>}
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {dayItems.length} item{dayItems.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: 'var(--color-glass-bg)',
                borderColor: 'var(--color-glass-border)',
              }}
            >
              {dayItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onItemClick(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--color-bg-hover)] transition-colors border-0 border-b last:border-0"
                  style={{ borderColor: 'var(--color-glass-border)' }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: item.done ? 'var(--color-status-done)' : (item.board_color ?? '#6366f1'),
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={clsx(
                        'text-sm truncate',
                        item.done
                          ? 'line-through text-[var(--color-text-muted)]'
                          : 'text-[var(--color-text-primary)]',
                      )}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] px-1 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: item.board_color ? `${item.board_color}20` : 'rgba(99,102,241,0.15)',
                          color: item.board_color ?? '#818cf8',
                        }}
                      >
                        {item.board_name}
                      </span>
                      {item.priority && (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                          <span className={clsx('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[item.priority] ?? 'bg-gray-500')} />
                          {item.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const { data: items, isLoading, isError, refetch } = useCalendarItems()
  const [view, setView] = useState<ViewMode>('month')

  const handleItemClick = (id: string) => {
    navigate(`/boards?item=${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-red-400">Failed to load calendar items</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Calendar
        </h1>
        <div
          className="flex items-center gap-0.5 rounded-lg p-0.5 border"
          style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-glass-border)',
          }}
        >
          <button
            onClick={() => setView('month')}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'month'
                ? 'text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            )}
            style={view === 'month' ? { background: 'var(--color-accent-light)' } : undefined}
          >
            <CalendarDays size={13} />
            Month
          </button>
          <button
            onClick={() => setView('agenda')}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'agenda'
                ? 'text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            )}
            style={view === 'agenda' ? { background: 'var(--color-accent-light)' } : undefined}
          >
            <List size={13} />
            Agenda
          </button>
        </div>
      </div>

      {(!items || items.length === 0) ? (
        <div className="flex flex-col items-center justify-center flex-1 text-[var(--color-text-muted)]">
          <CalendarDays size={32} className="opacity-40 mb-2" />
          <p className="text-sm">No items with due dates</p>
          <p className="text-xs mt-1 opacity-60">Create board items with due dates to see them here</p>
        </div>
      ) : view === 'month' ? (
        <MonthView items={items} onItemClick={handleItemClick} />
      ) : (
        <AgendaView items={items} onItemClick={handleItemClick} />
      )}
    </div>
  )
}

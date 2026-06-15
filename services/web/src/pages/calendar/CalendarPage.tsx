import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCalendarItems, type CalendarItem } from '@/hooks/useCalendarItems'
import { useBoards } from '@/hooks/useBoards'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, format, parseISO, isSameMonth, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, List, Loader2, RefreshCw, Plus, X } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui'

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

function NewEventModal({ onClose }: { onClose: () => void }) {
  const workspace = useAuthStore(s => s.workspace)
  const qc = useQueryClient()
  const { data: boards = [] } = useBoards()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [priority, setPriority] = useState<string>('medium')
  const [boardId, setBoardId] = useState('')

  const createEvent = useMutation({
    mutationFn: async () => {
      const bid = boardId || boards[0]?.id
      if (!bid) throw new Error('No board available')
      const firstGroup = await api.get(`/workspaces/${workspace!.id}/boards/${bid}`).then(r => r.data.data)
      const groupId = firstGroup.groups?.[0]?.id
      if (!groupId) throw new Error('Board has no groups')
      return api.post(`/workspaces/${workspace!.id}/boards/${bid}/items`, {
        group_id: groupId,
        title: title || 'Untitled Event',
        column_values: { priority, due_date: dueDate },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-items', workspace?.id] })
      toast.success('Event created.')
      onClose()
    },
    onError: () => toast.error('Failed to create event.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-xl w-full max-w-md p-5 space-y-4 animate-scale-in" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-glass-border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>New Event</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] transition-colors" style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Event title"
            className="rounded-lg px-3 py-2 text-sm outline-none transition-all duration-150"
            style={{
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-light)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--color-glass-border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none transition-all duration-150"
            style={{
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text-primary)',
            }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Board</label>
          <select value={boardId} onChange={e => setBoardId(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text-primary)',
            }}>
            {boards.length === 0 && <option value="">No boards available</option>}
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => createEvent.mutate()} disabled={createEvent.isPending || boards.length === 0}>
            {createEvent.isPending ? 'Creating…' : 'Create Event'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EventDetail({ item, onClose }: { item: CalendarItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-xl w-full max-w-sm p-5 space-y-3 animate-scale-in" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-glass-border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{item.title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] transition-colors" style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
        </div>
        <div className="space-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <div className="flex items-center gap-2">
            <CalendarDays size={13} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            {item.due_date ? format(parseISO(item.due_date), 'MMMM d, yyyy') : 'No date'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor: item.board_color ? `${item.board_color}20` : 'rgba(99,102,241,0.15)', color: item.board_color ?? '#818cf8' }}>
              {item.board_name}
            </span>
            {item.priority && (
              <span className="flex items-center gap-1 text-[10px]">
                <span className={clsx('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[item.priority] ?? 'bg-gray-500')} />
                {item.priority}
              </span>
            )}
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded', item.done ? 'text-green-400 bg-green-500/20' : 'text-yellow-400 bg-yellow-500/20')}>
              {item.done ? 'Done' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MonthView({ items, current, onMonthChange, onItemClick }: { items: CalendarItem[]; current: Date; onMonthChange: (d: Date) => void; onItemClick: (id: string) => void }) {
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
            onClick={() => onMonthChange(subMonths(current, 1))}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {format(current, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => onMonthChange(addMonths(current, 1))}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => onMonthChange(new Date())}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150"
          style={{
            background: 'var(--color-accent-light)',
            color: 'var(--color-accent-text)',
            border: '1px solid color-mix(in oklab, var(--color-accent) 20%, transparent)',
          }}
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1 gap-px">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-xs font-semibold text-center py-1.5" style={{ color: 'var(--color-text-muted)' }}>
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
                      'w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full mb-1',
                      today
                        ? 'text-white animate-pulse-glow'
                        : 'text-[var(--color-text-muted)]',
                      !today && 'hover:bg-[var(--color-bg-hover)]',
                    )}
                    style={today ? { background: 'var(--gradient-accent)' } : undefined}
                  >
                    {format(d, 'd')}
                  </div>

                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => (
                      <button
                        key={item.id}
                        onClick={() => onItemClick(item.id)}
                        className="w-full text-left truncate text-[11px] px-1.5 py-0.5 rounded font-medium transition-all hover:opacity-80"
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
      <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--color-text-muted)' }}>
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
              {isPast && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">overdue</span>}
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {dayItems.length} item{dayItems.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: 'var(--color-glass-bg)',
                borderColor: 'var(--color-glass-border)',
                backdropFilter: 'blur(12px)',
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
  const [current, setCurrent] = useState(new Date())
  const monthStart = useMemo(() => startOfMonth(current), [current])
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(current), { weekStartsOn: 1 }),
    [current],
  )
  const { data: items, isLoading, isError, refetch } = useCalendarItems(monthStart, gridEnd)
  const [view, setView] = useState<ViewMode>('month')
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [detailItem, setDetailItem] = useState<CalendarItem | null>(null)

  const handleItemClick = (id: string) => {
    const item = items?.find(i => i.id === id)
    if (item) {
      setDetailItem(item)
    } else {
      navigate(`/boards?item=${id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm" style={{ color: 'var(--color-status-blocked)' }}>Failed to load calendar items</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-glass-border)',
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
        <div className="flex items-center gap-2">
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
          <Button size="sm" onClick={() => setShowNewEvent(true)}>
            <Plus size={13} />
            New Event
          </Button>
        </div>
      </div>

      {(!items || items.length === 0) ? (
        <div className="flex flex-col items-center justify-center flex-1" style={{ color: 'var(--color-text-muted)' }}>
          <CalendarDays size={32} className="opacity-40 mb-2" />
          <p className="text-sm">No items with due dates</p>
          <p className="text-xs mt-1 opacity-60">Create board items with due dates to see them here</p>
        </div>
      ) : view === 'month' ? (
        <MonthView items={items} current={current} onMonthChange={setCurrent} onItemClick={handleItemClick} />
      ) : (
        <AgendaView items={items} onItemClick={handleItemClick} />
      )}

      {showNewEvent && <NewEventModal onClose={() => setShowNewEvent(false)} />}
      {detailItem && <EventDetail item={detailItem} onClose={() => setDetailItem(null)} />}
    </div>
  )
}

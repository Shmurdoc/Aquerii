import { useMemo } from 'react'
import { format, parseISO, isBefore, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useMyDayTasks, type MyDayTask } from '@/hooks/useMyDayTasks'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high:     'bg-orange-500/20 text-orange-400',
  medium:   'bg-yellow-500/20 text-yellow-400',
  low:      'bg-gray-500/20 text-gray-400',
}

function classifyTask(task: MyDayTask): 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' {
  if (task.done) return 'later'
  const now = new Date()
  const due = parseISO(task.due_date)

  if (isBefore(due, now) && !isToday(due)) return 'overdue'
  if (isToday(due)) return 'today'
  if (isTomorrow(due)) return 'tomorrow'
  if (isThisWeek(due, { weekStartsOn: 1 })) return 'this_week'
  return 'later'
}

interface SectionConfig {
  key: string
  label: string
  icon: typeof AlertCircle
  color: string
  accentColor: string
  badge?: string
  hideEmpty?: boolean
}

function TaskRow({ task, onToggle }: { task: MyDayTask; onToggle: (task: MyDayTask) => void }) {
  const navigate = useNavigate()

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-bg-hover transition-colors rounded-lg group">
      <button
        type="button"
        onClick={() => onToggle(task)}
        className="mt-0.5 shrink-0"
      >
        {task.done ? (
          <CheckCircle2 size={18} className="text-emerald-400" />
        ) : (
          <Circle size={18} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={clsx(
            'text-sm leading-snug truncate',
            task.done ? 'line-through text-gray-500' : 'text-gray-100',
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: task.board_color ? `${task.board_color}20` : 'rgba(99,102,241,0.15)',
              color: task.board_color ?? '#818cf8',
            }}
          >
            {task.board_name}
          </span>
          {task.priority && (
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', PRIORITY_BADGE[task.priority])}>
              {task.priority}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Calendar size={9} />
            {format(parseISO(task.due_date || new Date().toISOString()), 'MMM d')}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/boards')}
        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-all p-1"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

function SectionBlock({ config, tasks, onToggle }: {
  config: SectionConfig
  tasks: MyDayTask[]
  onToggle: (task: MyDayTask) => void
}) {
  const Icon = config.icon

  if (tasks.length === 0 && config.hideEmpty) return null

  return (
    <div
      className="rounded-xl border overflow-hidden relative"
      style={{
        background: 'var(--color-glass-bg)',
        borderColor: 'var(--color-glass-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl" style={{
        background: `linear-gradient(180deg, ${config.accentColor}, ${config.accentColor}66)`,
        boxShadow: `0 0 8px ${config.accentColor}44`,
      }} />
      <div className="flex items-center justify-between px-4 pt-3 pb-2 pl-5">
        <div className="flex items-center gap-2">
          <Icon size={14} className={config.color} />
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {config.label}
          </p>
          {config.badge && tasks.length > 0 && (
            <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', config.badge)}>
              {tasks.length}
            </span>
          )}
        </div>
      </div>
      {tasks.length > 0 ? (
        <div className="divide-y" style={{ borderColor: 'var(--color-glass-border)' }}>
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} onToggle={onToggle} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-gray-500">
          <p className="text-xs">None</p>
        </div>
      )}
    </div>
  )
}

function EmptySection({ label, icon: Icon }: { label: string; icon: typeof Clock }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
      <Icon size={28} className="mb-2 opacity-40" />
      <p className="text-sm">No {label.toLowerCase()}</p>
    </div>
  )
}

export default function MyDayPage() {
  const navigate = useNavigate()
  const { data: tasks, isLoading, isError, refetch } = useMyDayTasks()
  const workspace = useAuthStore(s => s.workspace)
  const qc = useQueryClient()

  const updateItem = useMutation({
    mutationFn: ({ boardId, itemId, data }: {
      boardId: string
      itemId: string
      data: { status?: string | null }
    }) =>
      api.patch(`/workspaces/${workspace!.id}/boards/${boardId}/items/${itemId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['my-day', workspace?.id] })
      qc.invalidateQueries({ queryKey: ['items', vars.boardId] })
    },
  })

  const now = new Date()

  const sections: SectionConfig[] = [
    {
      key: 'overdue',
      label: 'Overdue',
      icon: AlertCircle,
      color: 'text-red-400',
      accentColor: '#ef4444',
      badge: 'bg-red-500/20 text-red-400',
    },
    {
      key: 'today',
      label: 'Today',
      icon: Clock,
      color: 'text-amber-400',
      accentColor: '#f59e0b',
      badge: 'bg-amber-500/20 text-amber-400',
    },
    {
      key: 'tomorrow',
      label: 'Tomorrow',
      icon: Calendar,
      color: 'text-blue-400',
      accentColor: '#3b82f6',
    },
    {
      key: 'this_week',
      label: 'This Week',
      icon: Calendar,
      color: 'text-indigo-400',
      accentColor: '#818cf8',
    },
    {
      key: 'later',
      label: 'Later',
      icon: Clock,
      color: 'text-gray-400',
      accentColor: '#64748b',
      hideEmpty: true,
    },
  ]

  const grouped = useMemo(() => {
    if (!tasks) return {} as Record<string, MyDayTask[]>
    return sections.reduce((acc, section) => {
      acc[section.key] = tasks.filter(t => classifyTask(t) === section.key)
      return acc
    }, {} as Record<string, MyDayTask[]>)
  }, [tasks])

  const totalPending = useMemo(
    () => tasks?.filter(t => !t.done && classifyTask(t) !== 'later').length ?? 0,
    [tasks],
  )

  const handleToggle = (task: MyDayTask) => {
    updateItem.mutate(
      {
        boardId: task.board_id,
        itemId: task.id,
        data: { status: task.done ? null : 'done' as const },
      },
      { onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update task') }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-red-400">Failed to load tasks</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs bg-bg-surface px-3 py-1.5 rounded-lg hover:bg-bg-hover transition-colors"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: 'var(--gradient-accent-soft)',
            }}>
              <div className="w-4 h-4 rounded-sm" style={{ background: 'var(--gradient-accent)' }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                My Day
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {format(now, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
        {totalPending > 0 && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--color-accent)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--color-accent)' }} />
            </span>
            <span
              className="text-xs px-3 py-1 rounded-lg font-medium"
              style={{
                background: 'var(--color-accent-light)',
                color: 'var(--color-accent-text)',
                border: '1px solid color-mix(in oklab, var(--color-accent) 20%, transparent)',
              }}
            >
              {totalPending} pending
            </span>
          </div>
        )}
      </div>

      {(!tasks || tasks.length === 0) ? (
        <div
          className="rounded-xl border flex items-center justify-center py-16 relative"
          style={{
            background: 'var(--color-glass-bg)',
            borderColor: 'var(--color-glass-border)',
          }}
        >
          <EmptySection label="tasks for today" icon={CheckCircle2} />
        </div>
      ) : (
        sections.map(section => (
          <SectionBlock
            key={section.key}
            config={section}
            tasks={grouped[section.key] ?? []}
            onToggle={handleToggle}
          />
        ))
      )}

      <button
        type="button"
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 press-shrink"
        style={{
          background: 'var(--gradient-accent)',
          boxShadow: '0 4px 20px var(--color-accent-glow)',
        }}
        onClick={() => navigate('/boards')}
      >
        <Plus size={24} className="text-white" />
      </button>
    </div>
  )
}

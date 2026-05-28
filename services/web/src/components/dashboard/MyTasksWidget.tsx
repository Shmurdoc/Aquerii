import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import type { Board } from '@/hooks/useBoards'
import type { Item } from '@/hooks/useItems'
import { CheckSquare, AlertCircle, Calendar } from 'lucide-react'
import { format, parseISO, isBefore } from 'date-fns'
import clsx from 'clsx'

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high:     'bg-orange-500/20 text-orange-400',
  medium:   'bg-yellow-500/20 text-yellow-400',
  low:      'bg-gray-500/20 text-gray-400',
}

const STATUS_GROUP: Record<string, string> = {
  todo: 'text-status-todo',
  in_progress: 'text-status-progress',
  done: 'text-status-done',
}

interface TaskItem {
  id: string
  title: string
  boardId: string
  boardName: string
  boardColor: string | null
  status: string | null
  priority: string | null
  due_date: string | null
}

export function MyTasksWidget() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const workspace = useAuthStore(s => s.workspace)

  const { data: boards = [], isLoading: boardsLoading } = useQuery({
    queryKey: ['boards', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/boards`)
      return res.data.data as Board[]
    },
    enabled: !!workspace,
    staleTime: 60_000,
  })

  const boardIds = boards.map(b => b.id)

  const itemsQueries = useQuery({
    queryKey: ['my-items', workspace?.id, boardIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        boardIds.map(boardId =>
          api.get(`/workspaces/${workspace!.id}/boards/${boardId}/items`)
            .then(r => ({ boardId, items: r.data.data as Item[] }))
        )
      )
      return results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<{ boardId: string; items: Item[] }>).value)
    },
    enabled: boardIds.length > 0,
    staleTime: 30_000,
  })

  const tasks = useMemo<TaskItem[]>(() => {
    if (!itemsQueries.data || !user) return []

    const boardMap = new Map(boards.map(b => [b.id, b]))
    const myTasks: TaskItem[] = []

    for (const { boardId, items } of itemsQueries.data) {
      const board = boardMap.get(boardId)
      if (!board) continue

      for (const item of items) {
        const assigneeIds = (item.assignees ?? []).map(a => a.id)
        if (!assigneeIds.includes(user.id)) continue

        myTasks.push({
          id: item.id,
          title: item.title,
          boardId,
          boardName: board.name,
          boardColor: board.color,
          status: item.status,
          priority: item.priority,
          due_date: item.due_date,
        })
      }
    }

    return myTasks
  }, [itemsQueries.data, boards, user])

  const grouped = useMemo(() => {
    const groups: Record<string, TaskItem[]> = {
      todo: [],
      in_progress: [],
      done: [],
    }
    for (const task of tasks) {
      const key = task.status ?? 'todo'
      if (groups[key]) {
        groups[key].push(task)
      } else {
        groups.todo.push(task)
      }
    }
    return groups
  }, [tasks])

  const totalCount = tasks.length
  const overdueCount = tasks.filter(t => t.due_date && isBefore(parseISO(t.due_date), new Date())).length
  const displayedTasks = tasks.slice(0, 10)
  const hasMore = tasks.length > 10

  const loading = boardsLoading || itemsQueries.isLoading

  const renderSkeleton = () => (
    <div className="space-y-2 p-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-4 h-4 rounded bg-gray-800/50" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-gray-800/50 rounded w-3/4" />
            <div className="h-2.5 bg-gray-800/50 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <CheckSquare size={32} className="mb-2 opacity-40" />
      <p className="text-sm">No tasks assigned</p>
    </div>
  )

  const renderTasks = () => {
    if (displayedTasks.length === 0) return renderEmpty()

    return (
      <div className="divide-y" style={{ borderColor: 'var(--color-glass-border)' }}>
        {Object.entries(grouped).map(([status, statusTasks]) => {
          if (statusTasks.length === 0) return null
          return (
            <div key={status}>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider px-4 pt-3 pb-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span className={STATUS_GROUP[status] ?? 'text-gray-400'}>
                  {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
                <span className="text-gray-600 ml-1">({statusTasks.length})</span>
              </p>
              {statusTasks.slice(0, 10).map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => navigate(`/boards/${task.boardId}`)}
                  className="w-full text-left flex items-start gap-3 px-4 py-2.5 hover:bg-bg-hover transition-colors"
                >
                  <div
                    className={clsx(
                      'w-4 h-4 rounded border-2 mt-0.5 shrink-0',
                      task.status === 'done'
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-600',
                    )}
                  >
                    {task.status === 'done' && (
                      <svg viewBox="0 0 16 16" className="text-white" fill="currentColor">
                        <path d="M6.173 11.827l-3.5-3.5 1.175-1.175 2.325 2.325 4.825-4.825 1.175 1.175-6 6z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={clsx(
                        'text-sm leading-snug truncate',
                        task.status === 'done'
                          ? 'line-through text-gray-500'
                          : 'text-gray-100',
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: task.boardColor ? `${task.boardColor}20` : 'rgba(99,102,241,0.15)',
                          color: task.boardColor ?? '#818cf8',
                        }}
                      >
                        {task.boardName}
                      </span>
                      {task.priority && (
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', PRIORITY_BADGE[task.priority])}>
                          {task.priority}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={clsx(
                          'flex items-center gap-1 text-[10px]',
                          isBefore(parseISO(task.due_date), new Date()) && task.status !== 'done'
                            ? 'text-red-400'
                            : 'text-gray-500',
                        )}>
                          {isBefore(parseISO(task.due_date), new Date()) && task.status !== 'done' ? (
                            <AlertCircle size={9} />
                          ) : (
                            <Calendar size={9} />
                          )}
                          {format(parseISO(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-glass-bg)',
        borderColor: 'var(--color-glass-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            My Tasks
          </p>
          {totalCount > 0 && (
            <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-medium">
              {totalCount}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">
              {overdueCount} overdue
            </span>
          )}
        </div>
      </div>

      <div className="overflow-y-auto max-h-[480px]">
        {loading ? renderSkeleton() : renderTasks()}
      </div>

      {hasMore && (
        <div
          className="border-t px-4 py-2.5"
          style={{ borderColor: 'var(--color-glass-border)' }}
        >
          <button
            type="button"
            onClick={() => navigate('/boards')}
            className="text-xs font-medium text-accent-text hover:text-accent transition-colors"
          >
            View all ({tasks.length - 10} more)
          </button>
        </div>
      )}
    </div>
  )
}

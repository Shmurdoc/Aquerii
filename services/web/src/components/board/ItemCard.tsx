import type { Item } from '@/hooks/useItems'
import { format } from 'date-fns'
import { Calendar, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high:     'bg-orange-500/20 text-orange-400',
  medium:   'bg-yellow-500/20 text-yellow-400',
  low:      'bg-gray-500/20 text-gray-400',
}

interface Props {
  item: Item
  boardId: string
  isDragging?: boolean
}

export default function ItemCard({ item, boardId: _boardId, isDragging = false }: Props) {
  const isOverdue = item.due_date && new Date(item.due_date) < new Date()

  return (
    <div
      className={clsx(
        'bg-gray-800 border border-gray-700 rounded-lg shadow-sm px-3 py-2.5 cursor-pointer group',
        'transition-[border-color,box-shadow,transform] duration-150 ease-out',
        'hover:shadow-lg hover:border-indigo-500/40',
        isDragging && 'scale-105 ring-2 ring-indigo-500/50 shadow-2xl',
      )}
    >
      {/* Priority badge */}
      {item.priority && (
        <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium mb-1.5 inline-block', PRIORITY_COLOR[item.priority])}>
          {item.priority}
        </span>
      )}

      {/* Title */}
      <p
        className="text-sm text-[var(--color-text-primary)] group-hover:text-white leading-snug line-clamp-2 break-words"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {item.title}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2">
        {/* Assignees */}
        {item.assignees?.length > 0 && (
          <div className="flex -space-x-1">
            {item.assignees.slice(0, 3).map(a => (
              a.avatar_url ? (
                <img
                  key={a.id}
                  src={a.avatar_url}
                  alt={a.name}
                  className="w-5 h-5 rounded-full border border-gray-700"
                />
              ) : (
                <div
                  key={a.id}
                  className="w-5 h-5 rounded-full bg-indigo-700 border border-gray-700 flex items-center justify-center text-white text-[9px] font-bold"
                >
                  {a.name?.[0] ?? '?'}
                </div>
              )
            ))}
          </div>
        )}

        {/* Due date */}
        {item.due_date && (
          <div className={clsx('flex items-center gap-1 text-xs ml-auto', isOverdue ? 'text-[var(--color-status-blocked)]' : 'text-[var(--color-text-muted)]')}>
            {isOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
            {format(new Date(item.due_date), 'MMM d')}
          </div>
        )}
      </div>
    </div>
  )
}

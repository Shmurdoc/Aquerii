import type { Item } from '@/hooks/useItems'
import { format } from 'date-fns'
import { Calendar, AlertCircle, User } from 'lucide-react'
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
}

export default function ItemCard({ item, boardId }: Props) {
  const isOverdue = item.due_date && new Date(item.due_date) < new Date()

  return (
    <div className="bg-gray-800 border border-gray-700 hover:border-indigo-500/40 rounded-lg px-3 py-2.5 cursor-pointer transition-colors group">
      {/* Priority badge */}
      {item.priority && (
        <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium mb-1.5 inline-block', PRIORITY_COLOR[item.priority])}>
          {item.priority}
        </span>
      )}

      {/* Title */}
      <p className="text-sm text-gray-100 group-hover:text-white leading-snug line-clamp-2">
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
                  className="w-5 h-5 rounded-full bg-indigo-600 border border-gray-700 flex items-center justify-center text-white text-[9px] font-bold"
                >
                  {a.name[0]}
                </div>
              )
            ))}
          </div>
        )}

        {/* Due date */}
        {item.due_date && (
          <div className={clsx('flex items-center gap-1 text-xs ml-auto', isOverdue ? 'text-red-400' : 'text-gray-500')}>
            {isOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
            {format(new Date(item.due_date), 'MMM d')}
          </div>
        )}
      </div>
    </div>
  )
}

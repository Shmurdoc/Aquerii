import { useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'
import clsx from 'clsx'
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns'

export interface Activity {
  id: string
  icon: React.ReactNode
  actor: string
  action: string
  target: string
  targetHref?: string
  timestamp: string
  read: boolean
}

interface ActivityFeedProps {
  items: Activity[]
  loading?: boolean
  emptyMessage?: string
  viewAllHref?: string
  onViewAll?: () => void
}

function groupActivities(items: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {}

  for (const item of items) {
    const date = parseISO(item.timestamp)
    let key: string

    if (isToday(date)) {
      key = 'Today'
    } else if (isYesterday(date)) {
      key = 'Yesterday'
    } else if (isThisWeek(date)) {
      key = 'This Week'
    } else {
      key = format(date, 'MMMM d, yyyy')
    }

    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }

  return groups
}

export function ActivityFeed({
  items,
  loading = false,
  emptyMessage = 'No recent activity',
  viewAllHref,
  onViewAll,
}: ActivityFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(items.length)

  useEffect(() => {
    if (items.length > prevLengthRef.current && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
    prevLengthRef.current = items.length
  }, [items.length])

  const grouped = groupActivities(items)

  const renderSkeleton = () => (
    <div className="space-y-3 p-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-gray-800/50 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-800/50 rounded w-3/4" />
            <div className="h-2.5 bg-gray-800/50 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <Clock size={32} className="mb-2 opacity-40" />
      <p className="text-sm">{emptyMessage}</p>
    </div>
  )

  const renderItems = () => {
    const entries = Object.entries(grouped)

    if (entries.length === 0) return renderEmpty()

    return (
      <div className="divide-y" style={{ borderColor: 'var(--color-glass-border)' }}>
        {entries.map(([dateLabel, dateItems]) => (
          <div key={dateLabel}>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider px-4 pt-3 pb-1.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {dateLabel}
            </p>
            {dateItems.map((activity) => (
              <div
                key={activity.id}
                className={clsx(
                  'flex items-start gap-3 px-4 py-2.5 transition-colors',
                  !activity.read && 'bg-accent-light/5',
                  activity.targetHref ? 'hover:bg-bg-hover cursor-pointer' : '',
                )}
                onClick={() => {
                  if (activity.targetHref) {
                    window.location.href = activity.targetHref
                  }
                }}
              >
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    !activity.read
                      ? 'bg-accent-light text-accent-text'
                      : 'bg-gray-800 text-gray-500',
                  )}
                >
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm leading-snug truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <span className="font-medium">{activity.actor}</span>{' '}
                    {activity.action}{' '}
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {format(parseISO(activity.timestamp), 'h:mm a')}
                  </p>
                </div>
                {!activity.read && (
                  <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        ))}
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
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Activity
        </p>
      </div>

      <div ref={containerRef} className="overflow-y-auto max-h-[400px]">
        {loading ? renderSkeleton() : renderItems()}
      </div>

      {(viewAllHref || onViewAll) && items.length > 0 && (
        <div
          className="border-t px-4 py-2.5"
          style={{ borderColor: 'var(--color-glass-border)' }}
        >
          {onViewAll ? (
            <button
              onClick={onViewAll}
              className="text-xs font-medium text-accent-text hover:text-accent transition-colors"
            >
              View all activity
            </button>
          ) : (
            <a
              href={viewAllHref}
              className="text-xs font-medium text-accent-text hover:text-accent transition-colors"
            >
              View all activity
            </a>
          )}
        </div>
      )}
    </div>
  )
}

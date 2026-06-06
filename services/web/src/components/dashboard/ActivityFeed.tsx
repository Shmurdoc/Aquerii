import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import clsx from 'clsx'
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns'
import { staggerStyle } from '@/lib/motion'

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
  const navigate = useNavigate()

  useEffect(() => {
    if (items.length > prevLengthRef.current && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
    prevLengthRef.current = items.length
  }, [items.length])

  const grouped = groupActivities(items)
  let globalIndex = 0

  const renderSkeleton = () => (
    <div className="space-y-3 p-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-hover)] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-[var(--color-bg-hover)] rounded w-3/4" />
            <div className="h-2.5 bg-[var(--color-bg-hover)] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
      <Clock size={32} className="mb-2 opacity-40" aria-hidden="true" />
      <p className="text-body-sm">{emptyMessage}</p>
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
              className="text-micro font-semibold uppercase tracking-widest px-4 pt-3 pb-1.5 text-[var(--color-text-muted)]"
            >
              {dateLabel}
            </p>
            {dateItems.map((activity) => {
              const i = globalIndex++
              const handleClick = () => {
                if (activity.targetHref) {
                  navigate(activity.targetHref)
                }
              }
              const isClickable = !!activity.targetHref
              const Inner = (
                <>
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      'transition-colors duration-200 ease-out',
                      !activity.read
                        ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
                        : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]',
                    )}
                  >
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body leading-snug truncate text-[var(--color-text-primary)]">
                      <span className="font-medium">{activity.actor}</span>{' '}
                      {activity.action}{' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-label mt-0.5 text-[var(--color-text-muted)] tabular-nums">
                      {format(parseISO(activity.timestamp), 'h:mm a')}
                    </p>
                  </div>
                  {!activity.read && (
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0 mt-2 status-dot-pulse"
                      aria-label="Unread"
                    />
                  )}
                </>
              )
              if (isClickable) {
                return (
                  <button
                    type="button"
                    key={activity.id}
                    onClick={handleClick}
                    style={staggerStyle(i)}
                    className={clsx(
                      'stagger-item',
                      'w-full flex items-start gap-3 px-4 py-2.5 text-left',
                      'transition-colors duration-150 ease-out',
                      !activity.read && 'bg-[var(--color-accent-light)]/40',
                      'hover:bg-[var(--color-bg-hover)] focus:outline-none focus-visible:bg-[var(--color-bg-hover)]',
                    )}
                  >
                    {Inner}
                  </button>
                )
              }
              return (
                <div
                  key={activity.id}
                  style={staggerStyle(i)}
                  className={clsx(
                    'stagger-item flex items-start gap-3 px-4 py-2.5',
                    !activity.read && 'bg-[var(--color-accent-light)]/40',
                  )}
                >
                  {Inner}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="rounded-md border border-[var(--color-glass-border)] flex flex-col overflow-hidden bg-[var(--color-glass-bg)] backdrop-blur-md"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-micro font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          Activity
        </p>
        {items.length > 0 && (
          <span className="text-micro text-[var(--color-text-muted)] tabular-nums">
            {items.length}
          </span>
        )}
      </div>

      <div ref={containerRef} className="overflow-y-auto max-h-[400px]">
        {loading ? renderSkeleton() : renderItems()}
      </div>

      {(viewAllHref || onViewAll) && items.length > 0 && (
        <div
          className="border-t border-[var(--color-glass-border)] px-4 py-2.5"
        >
          {onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className="text-label font-medium text-[var(--color-accent-text)] hover:text-[var(--color-accent)] transition-colors"
            >
              View all activity →
            </button>
          ) : (
            <a
              href={viewAllHref}
              className="text-label font-medium text-[var(--color-accent-text)] hover:text-[var(--color-accent)] transition-colors"
            >
              View all activity →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

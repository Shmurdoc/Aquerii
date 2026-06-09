import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useNotifications } from '@/hooks/useNotifications'
import { useNotificationStore, type AppNotification, type NotificationData } from '@/stores/notificationStore'
import { formatDistanceToNow } from 'date-fns'
import { BellOff, CheckCheck, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '@/components/ui'

const PER_PAGE = 20

export default function InboxPage() {
  const { markRead, markAllRead, loadMore } = useNotifications()
  const notifications = useNotificationStore((s) => s.notifications)
  const hasMore = useNotificationStore((s) => s.hasMore)
  const unread = notifications.filter((n) => !n.read_at)
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  const handleClick = (n: AppNotification) => {
    if (!n.read_at) {
      markRead(n.id, {
        onError: () => toast.error('Failed to mark as read'),
      })
    }
    const data = n.data as NotificationData
    const link = data?.link ?? data?.url
    if (link) navigate(link)
  }

  const handleMarkAllRead = () => {
    markAllRead({
      onError: () => toast.error('Failed to mark all as read'),
    })
  }

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      const next = page + 1
      await loadMore(next)
      setPage(next)
    } catch {
      toast.error('Failed to load more notifications')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Inbox</h1>
          {unread.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{unread.length} unread</p>
          )}
        </div>
        {unread.length > 0 && (
          <Button size="sm" variant="ghost" onClick={handleMarkAllRead}>
            <CheckCheck size={13} />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: 'var(--color-text-muted)' }}>
            <BellOff size={32} className="opacity-50" />
            <p className="text-sm">You're all caught up</p>
          </div>
        )}
        {notifications.map((n) => {
          const data = n.data as NotificationData
          const message = data?.message ?? n.type
          return (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(n)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleClick(n) }}
              className={clsx('px-6 py-4 cursor-pointer transition-colors')}
              style={{
                background: !n.read_at ? 'var(--color-accent-subtle)' : undefined,
              }}
            >
              <div className="flex items-start gap-3">
                {!n.read_at && (
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-accent)' }} />
                )}
                <div className={clsx('flex-1 min-w-0', n.read_at && 'pl-[18px]')}>
                  <p className="text-sm leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                    {message}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        {hasMore && notifications.length > 0 && (
          <div className="flex justify-center py-4">
            <Button size="sm" variant="ghost" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Loading...
                </>
              ) : (
                `Load more (${PER_PAGE})`
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

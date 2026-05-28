import { useNotifications } from '@/hooks/useNotifications'
import { useNotificationStore } from '@/stores/notificationStore'
import { formatDistanceToNow } from 'date-fns'
import { BellOff, CheckCheck } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '@/components/ui'

export default function InboxPage() {
  const { markRead, markAllRead } = useNotifications()
  const notifications = useNotificationStore(s => s.notifications)
  const unread = notifications.filter(n => !n.read_at)

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
          <Button size="sm" variant="ghost" onClick={() => markAllRead()}>
            <CheckCheck size={13} />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ borderColor: 'var(--color-glass-border)' }}>
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: 'var(--color-text-muted)' }}>
            <BellOff size={32} className="opacity-50" />
            <p className="text-sm">You're all caught up</p>
          </div>
        )}
        {notifications.map(n => (
          <div
            key={n.id}
            role="button"
            tabIndex={0}
            onClick={() => { if (!n.read_at) markRead(n.id) }}
            onKeyDown={e => { if (e.key === 'Enter' && !n.read_at) markRead(n.id) }}
            className={clsx(
              'px-6 py-4 cursor-pointer transition-colors',
            )}
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
                  {(n.data as { message?: string }).message ?? n.type}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

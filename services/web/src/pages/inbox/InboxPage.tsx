import { useNotifications } from '@/hooks/useNotifications'
import { useNotificationStore } from '@/stores/notificationStore'
import { formatDistanceToNow } from 'date-fns'
import { BellOff, CheckCheck } from 'lucide-react'
import clsx from 'clsx'

export default function InboxPage() {
  const { markRead, markAllRead } = useNotifications()
  const notifications = useNotificationStore(s => s.notifications)
  const unread = notifications.filter(n => !n.read_at)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-100">Inbox</h1>
          {unread.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">{unread.length} unread</p>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-800">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-3">
            <BellOff size={32} className="text-gray-700" />
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
              'px-6 py-4 cursor-pointer hover:bg-gray-900 transition-colors',
              !n.read_at && 'bg-indigo-950/20'
            )}
          >
            <div className="flex items-start gap-3">
              {!n.read_at && (
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              )}
              <div className={clsx('flex-1 min-w-0', n.read_at && 'pl-[18px]')}>
                <p className="text-sm text-gray-200 leading-snug">
                  {(n.data as { message?: string }).message ?? n.type}
                </p>
                <p className="text-xs text-gray-600 mt-1">
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

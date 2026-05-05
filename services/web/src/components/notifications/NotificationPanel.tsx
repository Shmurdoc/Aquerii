import { useNotifications } from '@/hooks/useNotifications'
import { useNotificationStore } from '@/stores/notificationStore'
import { formatDistanceToNow } from 'date-fns'

interface Props { onClose: () => void }

export default function NotificationPanel({ onClose }: Props) {
  const { markRead, markAllRead } = useNotifications()
  const notifications = useNotificationStore((s) => s.notifications)

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-80 h-full bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-100">Notifications</h2>
          <button
            onClick={() => markAllRead()}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Mark all read
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 && (
            <div className="p-6 text-center text-gray-500 text-sm">No notifications</div>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${
                !n.read_at ? 'bg-indigo-900/10' : ''
              }`}
            >
              <p className="text-sm text-gray-200">
                {(n.data as { message?: string }).message ?? n.type}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

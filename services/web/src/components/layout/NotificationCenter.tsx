import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, TicketCheck, AtSign, UserPlus, MessageSquare, RefreshCw,
  DollarSign, FileText, LayoutGrid, Video, Mail, UserCheck, X,
  type LucideIcon,
} from 'lucide-react'
import { useNotificationStore, type AppNotification } from '@/stores/notificationStore'
import { useNotifications } from '@/hooks/useNotifications'
import clsx from 'clsx'

const NOTIF_ICONS: Record<string, LucideIcon> = {
  ticket: TicketCheck,
  mention: AtSign,
  assign: UserPlus,
  comment: MessageSquare,
  update: RefreshCw,
  deal: DollarSign,
  document: FileText,
  board: LayoutGrid,
  meeting: Video,
  email: Mail,
  employee: UserCheck,
  default: Bell,
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const ts = date.getTime()

  if (ts >= startOfToday) return 'Today'
  if (ts >= startOfYesterday) return 'Yesterday'
  if (ts >= startOfToday - 6 * 86_400_000) return 'This Week'
  return 'Older'
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getNotifIcon(type: string): LucideIcon {
  return NOTIF_ICONS[type] ?? NOTIF_ICONS.default
}

function getNotifRoute(n: AppNotification): string {
  const { type, data } = n
  const id = data?.id as string | undefined
  if (!id) return '/inbox'
  switch (type) {
    case 'ticket':
      return `/support/tickets/${id}`
    case 'deal':
      return '/crm'
    case 'document':
      return `/documents/${id}`
    case 'board':
      return `/boards/${id}`
    case 'meeting':
      return '/meetings'
    case 'email':
      return '/email'
    case 'employee':
      return `/employees?id=${id}`
    default:
      return '/inbox'
  }
}

interface Props {
  onClose: () => void
}

export default function NotificationCenter({ onClose }: Props) {
  const { notifications, markRead, markAllRead } = useNotificationStore()
  const { markRead: markReadApi, markAllRead: markAllReadApi } = useNotifications()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleNotifClick = (n: AppNotification) => {
    if (!n.read_at) {
      markRead(n.id)
      markReadApi(n.id)
    }
    navigate(getNotifRoute(n))
    onClose()
  }

  const grouped = notifications.reduce<Record<string, AppNotification[]>>((acc, n) => {
    const group = getDateGroup(n.created_at)
    if (!acc[group]) acc[group] = []
    acc[group].push(n)
    return acc
  }, {})

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older']

  const isLoaded = notifications.length > 0

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Notifications"
        style={{
          transition: 'transform var(--duration-300) var(--ease-spring)',
          background: 'var(--color-bg-base)',
          borderLeft: '1px solid var(--color-glass-border)',
        }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-sm flex flex-col shadow-lg animate-slide-up"
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-glass-border)' }}
        >
          <h2 className="text-sm font-semibold text-primary">Notifications</h2>
          <div className="flex items-center gap-2">
            {isLoaded && notifications.some((n) => !n.read_at) && (
              <button
                onClick={() => {
                  markAllRead()
                  markAllReadApi()
                }}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-hover transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!isLoaded ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-hover shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-hover rounded w-3/4" />
                    <div className="h-2 bg-hover rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Bell size={32} className="text-muted mb-3" />
              <p className="text-sm text-muted">No notifications</p>
            </div>
          ) : (
            groupOrder.map((group) => {
              const items = grouped[group]
              if (!items?.length) return null
              return (
                <div key={group}>
                  <p
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted"
                    style={{ background: 'var(--color-bg-surface)' }}
                  >
                    {group}
                  </p>
                  {items.map((n) => {
                    const Icon = getNotifIcon(n.type)
                    const isUnread = !n.read_at
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={clsx(
                          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                          isUnread
                            ? 'bg-[var(--color-accent-light)] bg-opacity-30'
                            : 'hover:bg-hover',
                        )}
                      >
                        <div className="relative shrink-0 mt-0.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--color-bg-elevated)' }}
                          >
                            <Icon size={15} className="text-muted" />
                          </div>
                          {isUnread && (
                            <span
                              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent"
                              style={{ border: '2px solid var(--color-bg-base)' }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={clsx(
                              'text-sm truncate',
                              isUnread ? 'text-primary font-medium' : 'text-secondary',
                            )}
                          >
                            {n.data?.title as string ?? n.type}
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            {formatTimestamp(n.created_at)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

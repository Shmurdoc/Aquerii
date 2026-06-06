import { create } from 'zustand'

export interface NotificationData {
  message?: string
  link?: string
  url?: string
  type?: string
  title?: string
  id?: string
}

export interface AppNotification {
  id: string
  type: string
  data: NotificationData
  read_at: string | null
  created_at: string
}

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  hasMore: boolean
  setNotifications: (n: AppNotification[], hasMore?: boolean) => void
  appendNotifications: (n: AppNotification[], hasMore: boolean) => void
  addNotification: (n: AppNotification) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  hasMore: false,

  setNotifications: (notifications, hasMore = false) => set({
    notifications,
    unreadCount: notifications.filter((n) => !n.read_at).length,
    hasMore,
  }),

  appendNotifications: (notifications, hasMore) => set((s) => {
    const existing = new Set(s.notifications.map((n) => n.id))
    const fresh = notifications.filter((n) => !existing.has(n.id))
    return {
      notifications: [...s.notifications, ...fresh],
      unreadCount: s.unreadCount + fresh.filter((n) => !n.read_at).length,
      hasMore,
    }
  }),

  addNotification: (n) => set((s) => ({
    notifications: [n, ...s.notifications],
    unreadCount: s.unreadCount + (n.read_at ? 0 : 1),
  })),

  markRead: (id) => set((s) => {
    const target = s.notifications.find((n) => n.id === id)
    if (!target || target.read_at) return s
    return {
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }
  }),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    unreadCount: 0,
  })),
}))

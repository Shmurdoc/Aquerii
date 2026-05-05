import { create } from 'zustand'

export interface AppNotification {
  id: string
  type: string
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  setNotifications: (n: AppNotification[]) => void
  addNotification: (n: AppNotification) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter((n) => !n.read_at).length,
  }),

  addNotification: (n) => set((s) => ({
    notifications: [n, ...s.notifications],
    unreadCount: s.unreadCount + (n.read_at ? 0 : 1),
  })),

  markRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) =>
      n.id === id ? { ...n, read_at: new Date().toISOString() } : n
    ),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    unreadCount: 0,
  })),
}))

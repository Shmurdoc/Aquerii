import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { api } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface Props {
  onCmdOpen: () => void
  onNotifOpen: () => void
}

export default function TopBar({ onCmdOpen, onNotifOpen }: Props) {
  const user        = useAuthStore((s) => s.user)
  const clearAuth   = useAuthStore((s) => s.logout)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const navigate    = useNavigate()

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    clearAuth()
    navigate('/login')
  }

  return (
    <header className="h-12 bg-gray-950 border-b border-gray-800 flex items-center px-4 gap-3 flex-shrink-0">
      {/* Search / command palette trigger */}
      <button
        onClick={onCmdOpen}
        className="flex-1 max-w-xs flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg pl-2.5 pr-3 py-1.5 text-xs text-gray-500 hover:border-gray-500 transition-colors"
      >
        <Search size={13} className="text-gray-500 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-gray-600 hidden sm:inline">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <button
          onClick={onNotifOpen}
          className="relative p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar / logout */}
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0] ?? 'U'}
            </div>
          )}
        </button>
      </div>
    </header>
  )
}

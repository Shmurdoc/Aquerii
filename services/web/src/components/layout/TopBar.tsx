import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function TopBar() {
  const user = useAuthStore(s => s.user)

  return (
    <header className="h-12 bg-gray-950 border-b border-gray-800 flex items-center px-4 gap-3 flex-shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-xs relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors">
          <Bell size={16} />
        </button>

        {/* Avatar */}
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0] ?? 'U'}
          </div>
        )}
      </div>
    </header>
  )
}

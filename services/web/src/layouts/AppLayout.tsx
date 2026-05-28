import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import NavRail      from '@/components/layout/NavRail'
import ContextPanel from '@/components/layout/ContextPanel'
import CommandPalette from '@/components/layout/CommandPalette'
import { ConflictResolver } from '@/components/sync/ConflictResolver'
import { SyncStatus } from '@/components/sync/SyncStatus'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export default function AppLayout() {
  const [cmdOpen,     setCmdOpen]     = useState(false)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const setUser     = useAuthStore(s => s.setUser)
  const token       = useAuthStore(s => s.token)

  // Refresh user profile on mount so stale data from login is updated
  useEffect(() => {
    if (!token) return
    api.get('/me').then(r => {
      if (r.data?.data) setUser(r.data.data)
    }).catch(() => { /* non-fatal — user profile stays as-is */ })
  }, [token, setUser])

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Ensure sockets / background listeners are initialized once AppLayout mounts
  useEffect(() => {
    // Trigger a lightweight /me call to ensure auth state is warmed and any dependent modules can start their listeners.
    // Non-fatal: swallow errors.
    api.get('/me').catch(() => {})
  }, [])

  // Close drawer on route changes (any click inside closes it)
  function closeDrawer() { setDrawerOpen(false) }

  return (
    <div className="flex h-screen text-gray-100 overflow-hidden" style={{ background: 'var(--color-bg-deepest)' }}>
      {/* Desktop sidebar (hidden on mobile) */}
      <div className="hidden md:flex md:shrink-0">
        <NavRail onCmdOpen={() => setCmdOpen(true)} />
        <ContextPanel />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center gap-3 px-4 h-12" style={{ background: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-glass-border)' }}>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          <Menu size={18} />
        </button>
        <span className="text-sm font-semibold text-white">Aquerii</span>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 flex transition-transform duration-200 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navigation drawer"
        role="dialog"
        aria-modal="true"
      >
        <NavRail onCmdOpen={() => { setCmdOpen(true); closeDrawer() }} />
        <ContextPanel onNavigate={closeDrawer} />
        <button
          onClick={closeDrawer}
          aria-label="Close navigation"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main content — top padding on mobile to clear the top bar */}
      <main className="flex-1 overflow-auto min-w-0 pt-12 md:pt-0" style={{ background: 'var(--color-bg-base)' }}>
        <Outlet />
      </main>

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
      <ConflictResolver />
      <SyncStatus />
    </div>
  )
}

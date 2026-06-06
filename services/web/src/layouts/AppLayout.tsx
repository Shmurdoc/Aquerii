import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import NavRail      from '@/components/layout/NavRail'
import ContextPanel from '@/components/layout/ContextPanel'
import TopBar       from '@/components/layout/TopBar'
import CommandPalette from '@/components/layout/CommandPalette'
import NotificationCenter from '@/components/layout/NotificationCenter'
import { ConflictResolver } from '@/components/sync/ConflictResolver'
import { SyncStatus } from '@/components/sync/SyncStatus'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useSocket } from '@/hooks/useSocket'

export default function AppLayout() {
  const [cmdOpen,        setCmdOpen]        = useState(false)
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [notifOpen,      setNotifOpen]      = useState(false)
  const setUser     = useAuthStore(s => s.setUser)
  const token       = useAuthStore(s => s.token)

  useSocket()

  useEffect(() => {
    if (!token) return
    api.get('/me').then(r => {
      if (r.data?.data) setUser(r.data.data)
    }).catch(() => { /* non-fatal — user profile stays as-is */ })
  }, [token, setUser])

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

  useEffect(() => {
    api.get('/me').catch(() => {})
  }, [])

  function closeDrawer() { setDrawerOpen(false) }

  return (
    <div className="flex h-screen text-[var(--color-text-primary)] overflow-hidden bg-[var(--color-bg-deepest)]">
      <div className="hidden md:flex md:shrink-0">
        <NavRail onCmdOpen={() => setCmdOpen(true)} />
        <ContextPanel />
      </div>

      <div
        className={`md:hidden fixed inset-y-0 left-0 z-[var(--z-modal-backdrop)] flex transition-transform duration-300 ease-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navigation drawer"
        role="dialog"
        aria-modal="true"
      >
        <NavRail onCmdOpen={() => { setCmdOpen(true); closeDrawer() }} />
        <ContextPanel onNavigate={closeDrawer} />
        <button
          onClick={closeDrawer}
          aria-label="Close navigation"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors press-shrink"
        >
          <X size={16} />
        </button>
      </div>

      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-[var(--z-modal-backdrop)] bg-black/65 backdrop-blur-md animate-fade-in"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuOpen={() => setDrawerOpen(true)}
          onNotifOpen={() => setNotifOpen(true)}
          onCmdOpen={() => setCmdOpen(true)}
        />

        <main className="flex-1 overflow-auto min-w-0" style={{ background: 'var(--color-bg-base)' }}>
          <Outlet />
        </main>
      </div>

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
      {notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} />}
      <ConflictResolver />
      <SyncStatus />
    </div>
  )
}

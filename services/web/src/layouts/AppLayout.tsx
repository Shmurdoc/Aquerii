import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import TopBar  from '@/components/layout/TopBar'
import CommandPalette from '@/components/layout/CommandPalette'
import NotificationPanel from '@/components/notifications/NotificationPanel'

export default function AppLayout() {
  const [cmdOpen, setCmdOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onCmdOpen={() => setCmdOpen(true)} onNotifOpen={() => setNotifOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      {cmdOpen    && <CommandPalette    onClose={() => setCmdOpen(false)} />}
      {notifOpen  && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </div>
  )
}

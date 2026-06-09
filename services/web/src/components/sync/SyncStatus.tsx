import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Don't show if online and nothing pending
  if (isOnline && pendingCount === 0 && !syncing) return null

  return (
    <div
      className={clsx(
        'fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium shadow-lg',
        isOnline
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      )}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {syncing ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isOnline ? (
        <Wifi size={14} />
      ) : (
        <WifiOff size={14} />
      )}

      {syncing ? (
        <span>Syncing changes…</span>
      ) : isOnline ? (
        <span>
          {pendingCount > 0
            ? `${pendingCount} change${pendingCount > 1 ? 's' : ''} pending sync`
            : 'Online'}
        </span>
      ) : (
        <span>
          Offline{pendingCount > 0 ? ` — ${pendingCount} pending` : ''}
        </span>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { getConflicts, resolveConflict, removeConflict, type SyncConflict } from '@/offline/MutationQueue'
import { AlertTriangle, Check, X, GitMerge } from 'lucide-react'
import { Button } from '@/components/ui'
import clsx from 'clsx'

interface Props {
  onResolved?: () => void
}

export function ConflictResolver({ onResolved }: Props) {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConflicts()
  }, [])

  async function loadConflicts() {
    const items = await getConflicts()
    setConflicts(items.filter(c => !c.resolution))
    setLoading(false)
  }

  async function handleResolve(id: string, resolution: SyncConflict['resolution'], mergedData?: unknown) {
    await resolveConflict(id, resolution, mergedData)
    await removeConflict(id)
    setConflicts(prev => prev.filter(c => c.id !== id))
    onResolved?.()
  }

  async function handleResolveAll(strategy: 'keep_local' | 'keep_server') {
    for (const conflict of conflicts) {
      await handleResolve(conflict.id, strategy === 'keep_local' ? 'local' : 'server')
    }
  }

  if (loading) return null
  if (conflicts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div
        className="rounded-xl border border-amber-500/30 bg-[var(--color-bg-surface)] shadow-2xl overflow-hidden"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <AlertTriangle size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {conflicts.length} Sync Conflict{conflicts.length > 1 ? 's' : ''}
          </h3>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-[var(--color-glass-border)]">
          {conflicts.map(conflict => (
            <ConflictRow
              key={conflict.id}
              conflict={conflict}
              onResolve={(resolution) => handleResolve(conflict.id, resolution)}
            />
          ))}
        </div>

        {conflicts.length > 1 && (
          <div className="flex gap-2 px-4 py-3 border-t border-[var(--color-glass-border)]">
            <Button size="sm" variant="ghost" onClick={() => handleResolveAll('keep_local')}>
              Keep all mine
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleResolveAll('keep_server')}>
              Keep all theirs
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ConflictRow({
  conflict,
  onResolve,
}: {
  conflict: SyncConflict
  onResolve: (resolution: SyncConflict['resolution']) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const localData = conflict.localData as Record<string, unknown>
  const serverData = conflict.serverData as Record<string, unknown>

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
            {conflict.entityType} — {String(localData?.title ?? localData?.name ?? conflict.entityId).slice(0, 40)}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
            Changed while you were offline
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onResolve('local')}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
        >
          <Check size={10} /> Keep mine
        </button>
        <button
          onClick={() => onResolve('server')}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
        >
          <Check size={10} /> Keep theirs
        </button>
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <GitMerge size={10} /> Compare
        </button>
      </div>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded bg-emerald-500/10 p-2">
            <p className="font-medium text-emerald-400 mb-1">Your version</p>
            <pre className="text-[var(--color-text-secondary)] whitespace-pre-wrap overflow-auto max-h-24">
              {JSON.stringify(localData, null, 2)}
            </pre>
          </div>
          <div className="rounded bg-blue-500/10 p-2">
            <p className="font-medium text-blue-400 mb-1">Their version</p>
            <pre className="text-[var(--color-text-secondary)] whitespace-pre-wrap overflow-auto max-h-24">
              {JSON.stringify(serverData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

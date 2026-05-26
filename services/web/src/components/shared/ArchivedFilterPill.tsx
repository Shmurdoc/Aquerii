import React from 'react'
import { Archive } from 'lucide-react'

interface Props {
  showArchived: boolean
  onToggle: () => void
}

export function ArchivedFilterPill({ showArchived, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        showArchived
          ? 'border-accent text-accent bg-accent-light'
          : 'border-glass-border text-text-muted hover:border-glass-border-hover hover:text-text-secondary'
      }`}
    >
      <Archive size={12} />
      {showArchived ? 'Showing archived' : 'Show archived'}
    </button>
  )
}

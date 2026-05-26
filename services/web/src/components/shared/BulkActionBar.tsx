import React from 'react'
import { X } from 'lucide-react'

interface BulkAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface Props {
  selectedCount: number
  onClearSelection: () => void
  actions: BulkAction[]
}

export function BulkActionBar({ selectedCount, onClearSelection, actions }: Props) {
  if (selectedCount === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-glass-border)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {selectedCount} selected
      </span>

      <div className="w-px h-5 bg-white/10" />

      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            action.variant === 'danger'
              ? 'text-red-400 hover:bg-red-500/15'
              : 'hover:bg-white/10'
          }`}
          style={{ color: action.variant === 'danger' ? undefined : 'var(--color-text-primary)' }}
        >
          {action.icon}
          {action.label}
        </button>
      ))}

      <div className="w-px h-5 bg-white/10" />

      <button
        onClick={onClearSelection}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        title="Clear selection"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <X size={16} />
      </button>
    </div>
  )
}

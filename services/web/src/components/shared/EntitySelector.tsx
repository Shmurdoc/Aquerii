import React, { useState, useRef, useEffect } from 'react'
import { Building2, X, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'

export interface Entity {
  id: string
  name: string
  entity_type: string
  email?: string | null
  phone?: string | null
}

interface Props {
  workspaceId: string
  value?: Entity | null
  onChange: (entity: Entity | null) => void
  placeholder?: string
  entityType?: 'customer' | 'supplier' | 'both' | 'prospect'
  disabled?: boolean
  className?: string
}

export function EntitySelector({
  workspaceId,
  value,
  onChange,
  placeholder = 'Search companies...',
  entityType,
  disabled = false,
  className = '',
}: Props) {
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [results, setResults] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)
  const debouncedQuery        = useDebounce(query, 250)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)

    const params: Record<string, string> = { q: debouncedQuery }
    if (entityType) params.type = entityType

    api
      .get<{ entities: Entity[] }>(`/workspaces/${workspaceId}/entities/search`, { params })
      .then((r) => { if (!cancelled) setResults(r.data.entities ?? []) })
      .catch(() => { if (!cancelled) setResults([]) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [debouncedQuery, open, workspaceId, entityType])

  const openDropdown = () => {
    if (disabled) return
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const select = (entity: Entity) => {
    onChange(entity)
    setOpen(false)
    setQuery('')
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <div
        onClick={openDropdown}
        className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
        }`}
        style={{
          background: 'var(--color-bg-input)',
          borderColor: open ? 'var(--color-accent)' : 'var(--color-glass-border)',
          minHeight: 38,
        }}
      >
        <Building2 size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />

        {value && !open ? (
          <>
            <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
              {value.name}
            </span>
            {!disabled && (
              <button onClick={clear} className="p-0.5 rounded hover:bg-white/10">
                <X size={13} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )}
          </>
        ) : open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          />
        ) : (
          <span className="flex-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {placeholder}
          </span>
        )}

        {!open && <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-md border z-50 overflow-hidden shadow-lg"
          style={{
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-glass-border)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div className="px-3 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {query ? 'No companies found' : 'Type to search'}
            </div>
          ) : (
            results.map((entity) => (
              <button
                key={entity.id}
                onMouseDown={() => select(entity)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}
                >
                  {entity.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {entity.name}
                  </div>
                  {entity.email && (
                    <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {entity.email}
                    </div>
                  )}
                </div>
                <span
                  className="text-xs px-1.5 py-0.5 rounded border flex-shrink-0"
                  style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}
                >
                  {entity.entity_type}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

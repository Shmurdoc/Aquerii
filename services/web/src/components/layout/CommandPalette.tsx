import { useEffect, useState, useCallback, useRef, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutGrid, CheckSquare, FileText, User, DollarSign, Building2,
  Target, TicketCheck, Mail, Video, UserCheck, Search, Clock,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'

const ENTITY_ICONS: Record<string, LucideIcon> = {
  board: LayoutGrid,
  item: CheckSquare,
  document: FileText,
  contact: User,
  deal: DollarSign,
  company: Building2,
  lead: Target,
  ticket: TicketCheck,
  email: Mail,
  meeting: Video,
  employee: UserCheck,
}

const STATIC_COMMANDS = [
  { label: 'Go to Dashboard', to: '/dashboard' },
  { label: 'Go to Boards', to: '/boards' },
  { label: 'Go to CRM', to: '/crm' },
  { label: 'Go to Documents', to: '/documents' },
  { label: 'Go to AI Chat', to: '/ai/chat' },
  { label: 'Go to Settings', to: '/settings' },
  { label: 'Go to Reports', to: '/reports' },
  { label: 'Go to Automation', to: '/automation' },
  { label: 'Go to Meetings', to: '/meetings' },
  { label: 'Go to Email', to: '/email' },
  { label: 'Go to Employees', to: '/employees' },
  { label: 'Go to Inbox', to: '/inbox' },
  { label: 'Go to Support', to: '/support' },
  { label: 'Go to Marketing', to: '/marketing' },
  { label: 'Go to ERP', to: '/erp' },
]

const RECENT_KEY = 'command-palette:recent'
const MAX_RECENT = 8

interface RecentItem {
  id: string
  title: string
  type: string
}

interface SearchResult {
  id: string
  title: string
  type: string
  subtitle?: string
}

interface ActionItem {
  id: string
  label: string
  subtitle?: string
  badge?: string
  icon?: LucideIcon
  action: () => void
}

function getRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentItem(item: { id: string; title: string; type: string }) {
  try {
    const recent = getRecent().filter((r) => r.id !== item.id)
    recent.unshift(item)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {}
}

interface Props {
  onClose: () => void
  onOpenItem?: (itemId: string) => void
}

export default function CommandPalette({ onClose, onOpenItem }: Props) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])
  const navigate = useNavigate()
  const workspace = useAuthStore((s) => s.workspace)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    inputRef.current?.focus()
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const { data: results } = useQuery({
    queryKey: ['search', workspace?.id, query],
    queryFn: () =>
      api.get(`/workspaces/${workspace!.id}/search?q=${encodeURIComponent(query)}`).then((r) => r.data.data),
    enabled: !!workspace && query.length > 1,
  })

  const handleResultClick = useCallback(
    (r: { id: string; title: string; type: string }) => {
      saveRecentItem(r)
      switch (r.type) {
        case 'board':
          navigate(`/boards/${r.id}`)
          break
        case 'document':
          navigate(`/documents/${r.id}`)
          break
        case 'item':
          if (onOpenItem) {
            onOpenItem(r.id)
          } else {
            navigate('/boards')
          }
          break
        case 'contact':
        case 'deal':
        case 'company':
          navigate('/crm')
          break
        case 'ticket':
          navigate(`/support/tickets/${r.id}`)
          break
        case 'email':
          navigate('/email')
          break
        case 'meeting':
          navigate(`/meetings?id=${r.id}`)
          break
        case 'employee':
          navigate(`/employees?id=${r.id}`)
          break
        default:
          break
      }
      onClose()
    },
    [navigate, onClose, onOpenItem],
  )

  const commands: ActionItem[] = STATIC_COMMANDS.filter(
    (c) => !query || c.label.toLowerCase().includes(query.toLowerCase()),
  ).map((c) => ({
    id: `cmd:${c.to}`,
    label: c.label,
    icon: Search,
    action: () => {
      navigate(c.to)
      onClose()
    },
  }))

  const recentItems: ActionItem[] = !query
    ? getRecent().map((r) => ({
        id: `recent:${r.id}`,
        label: r.title,
        badge: r.type,
        icon: ENTITY_ICONS[r.type],
        action: () => handleResultClick(r),
      }))
    : []

  const searchItems: ActionItem[] = (results ?? []).map((r: SearchResult) => ({
    id: `search:${r.id}`,
    label: r.title,
    subtitle: r.subtitle,
    badge: r.type,
    icon: ENTITY_ICONS[r.type],
    action: () => handleResultClick(r),
  }))

  const allItems = [...commands, ...recentItems, ...searchItems]
  const hasCommands = commands.length > 0
  const hasRecent = recentItems.length > 0
  const hasSearch = searchItems.length > 0

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query, results])

  useEffect(() => {
    itemsRef.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => (i + 1) % Math.max(allItems.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => (i - 1 + allItems.length) % Math.max(allItems.length, 1))
    } else if (e.key === 'Enter' && allItems[highlightedIndex]) {
      e.preventDefault()
      allItems[highlightedIndex].action()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface glass-border rounded-xl shadow-lg overflow-hidden animate-scale-in"
        style={{ border: '1px solid var(--color-glass-border)' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          autoFocus
          type="text"
          placeholder="Search or type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent px-4 py-3 text-sm text-primary placeholder-text-muted outline-none"
          style={{ borderBottom: '1px solid var(--color-glass-border)' }}
        />

        <div className="max-h-80 overflow-y-auto py-1">
          {!hasCommands && !hasRecent && !hasSearch && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              {query.length > 0 ? 'No results found' : 'Start typing to search…'}
            </p>
          )}

          {hasCommands && (
            <SectionHeader label="Commands" />
          )}
          {commands.map((item, idx) => (
              <CommandRow
                key={item.id}
                ref={(el: HTMLButtonElement | null) => { itemsRef.current[idx] = el }}
                item={item}
                highlighted={highlightedIndex === idx}
                onHover={() => setHighlightedIndex(idx)}
                onSelect={item.action}
              />
            ))}

          {hasRecent && (
            <SectionHeader label="Recent" />
          )}
          {recentItems.map((item, idx) => {
            const globalIdx = commands.length + idx
            return (
              <CommandRow
                key={item.id}
                ref={(el: HTMLButtonElement | null) => { itemsRef.current[globalIdx] = el }}
                item={item}
                highlighted={highlightedIndex === globalIdx}
                onHover={() => setHighlightedIndex(globalIdx)}
                onSelect={item.action}
              />
            )
          })}

          {hasSearch && (
            <SectionHeader label="Search Results" />
          )}
          {searchItems.map((item, idx) => {
            const globalIdx = commands.length + recentItems.length + idx
            return (
              <CommandRow
                key={item.id}
                ref={(el: HTMLButtonElement | null) => { itemsRef.current[globalIdx] = el }}
                item={item}
                highlighted={highlightedIndex === globalIdx}
                onHover={() => setHighlightedIndex(globalIdx)}
                onSelect={item.action}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"
      style={{ borderBottom: '1px solid var(--color-glass-border)' }}
    >
      {label}
    </p>
  )
}

interface CommandRowProps {
  item: ActionItem
  highlighted: boolean
  onHover: () => void
  onSelect: () => void
}

const CommandRow = forwardRef<HTMLButtonElement, CommandRowProps>(function CommandRow({
  item,
  highlighted,
  onHover,
  onSelect,
}, ref) {
  const Icon = item.icon
  return (
    <button
      ref={ref}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
        highlighted ? 'bg-hover text-primary' : 'text-secondary',
      )}
    >
      {Icon && (
        <Icon size={16} className="shrink-0 text-muted" />
      )}
      <span className="flex-1 text-left truncate">{item.label}</span>
      {item.badge && (
        <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">{item.badge}</span>
      )}
      {highlighted && (
        <Clock size={14} className="shrink-0 text-accent" />
      )}
    </button>
  )
})

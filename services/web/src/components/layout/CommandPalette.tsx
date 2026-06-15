import { useEffect, useState, useCallback, useRef, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutGrid, CheckSquare, FileText, User, DollarSign, Building2,
  Target, TicketCheck, Mail, Video, UserCheck, Search, Clock, Wand2, ShieldCheck, BarChart3,
  CornerDownLeft,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useReducedMotion } from '@/lib/motion'

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
  module: LayoutGrid,
  action: Wand2,
  template: FileText,
  report: BarChart3,
  recent: Clock,
  security: ShieldCheck,
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
  to?: string
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
  } catch {
    /* ignore quota errors */
  }
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
  const reduced = useReducedMotion()

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
      api
        .get(`/workspaces/${workspace!.id}/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.data.data),
    enabled: !!workspace && query.length > 1,
  })

  const handleResultClick = useCallback(
    (r: { id: string; title: string; type: string; to?: string }) => {
      saveRecentItem(r)

      if (r.to) {
        navigate(r.to)
        onClose()
        return
      }

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
        case 'module':
        case 'action':
        case 'recent':
          navigate('/dashboard')
          break
        case 'template':
          navigate('/automation')
          break
        case 'report':
          navigate('/reports')
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
      className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[14vh] bg-black/65 backdrop-blur-md animate-backdrop-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={clsx(
          'w-full max-w-xl overflow-hidden',
          'rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)]',
          'shadow-[var(--shadow-elevated)]',
          !reduced && 'animate-modal-in',
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-glass-border)]">
          <Search size={16} className="text-[var(--color-text-muted)] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            placeholder="Search or type a command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
            aria-label="Search commands"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-micro font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-hover)] border border-[var(--color-glass-border)] rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div
          id="command-palette-list"
          role="listbox"
          className="max-h-80 overflow-y-auto py-1"
        >
          {!hasCommands && !hasRecent && !hasSearch && (
            <p className="px-4 py-10 text-center text-body-sm text-[var(--color-text-muted)]">
              {query.length > 0 ? 'No results found' : 'Start typing to search…'}
            </p>
          )}

          {hasCommands && <SectionHeader label="Commands" />}
          {commands.map((item, idx) => (
            <CommandRow
              key={item.id}
              ref={(el: HTMLButtonElement | null) => {
                itemsRef.current[idx] = el
              }}
              item={item}
              highlighted={highlightedIndex === idx}
              onHover={() => setHighlightedIndex(idx)}
              onSelect={item.action}
            />
          ))}

          {hasRecent && <SectionHeader label="Recent" />}
          {recentItems.map((item, idx) => {
            const globalIdx = commands.length + idx
            return (
              <CommandRow
                key={item.id}
                ref={(el: HTMLButtonElement | null) => {
                  itemsRef.current[globalIdx] = el
                }}
                item={item}
                highlighted={highlightedIndex === globalIdx}
                onHover={() => setHighlightedIndex(globalIdx)}
                onSelect={item.action}
              />
            )
          })}

          {hasSearch && <SectionHeader label="Search Results" />}
          {searchItems.map((item, idx) => {
            const globalIdx = commands.length + recentItems.length + idx
            return (
              <CommandRow
                key={item.id}
                ref={(el: HTMLButtonElement | null) => {
                  itemsRef.current[globalIdx] = el
                }}
                item={item}
                highlighted={highlightedIndex === globalIdx}
                onHover={() => setHighlightedIndex(globalIdx)}
                onSelect={item.action}
              />
            )
          })}
        </div>

        <div
          className="flex items-center gap-3 px-4 py-2 border-t border-[var(--color-glass-border)] bg-[var(--color-bg-base)] text-micro text-[var(--color-text-muted)]"
        >
          <span className="inline-flex items-center gap-1">
            <KbdHint label="↑↓" />
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <KbdHint label="↵" />
            select
          </span>
          <span className="inline-flex items-center gap-1">
            <KbdHint label="esc" />
            close
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <CornerDownLeft size={11} aria-hidden="true" />
            <span className="hidden sm:inline">Powered by Aquerii</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function KbdHint({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-hover)] border border-[var(--color-glass-border)] rounded px-1.5 py-0.5">
      {label}
    </kbd>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-4 py-1.5 text-micro font-semibold uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-glass-border)]">
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

const CommandRow = forwardRef<HTMLButtonElement, CommandRowProps>(function CommandRow(
  { item, highlighted, onHover, onSelect },
  ref,
) {
  const Icon = item.icon
  return (
    <button
      ref={ref}
      role="option"
      aria-selected={highlighted}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-2.5 text-body-sm text-left',
        'transition-[background,color] duration-100 ease-out',
        highlighted
          ? 'bg-[var(--color-accent-light)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]',
      )}
    >
      {Icon && (
        <Icon
          size={15}
          className={clsx(
            'shrink-0 transition-colors',
            highlighted ? 'text-[var(--color-accent-text)]' : 'text-[var(--color-text-muted)]',
          )}
          aria-hidden="true"
        />
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {item.subtitle && (
        <span className="text-label text-[var(--color-text-muted)] truncate hidden sm:inline">
          {item.subtitle}
        </span>
      )}
      {item.badge && (
        <span
          className={clsx(
            'text-micro uppercase tracking-widest shrink-0 px-1.5 py-0.5 rounded',
            highlighted
              ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent-text)]'
              : 'text-[var(--color-text-muted)]',
          )}
        >
          {item.badge}
        </span>
      )}
      {highlighted && (
        <CornerDownLeft
          size={12}
          className="shrink-0 text-[var(--color-accent-text)]"
          aria-hidden="true"
        />
      )}
    </button>
  )
})

import { useState, useRef, useMemo, useEffect, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { clsx } from 'clsx'

type Member = {
  id: string
  user_id: string
  name: string
  email: string
  avatar_url: string | null
}

export interface MentionInputProps {
  value: string
  onChange: (value: string, mentionUserIds: string[]) => void
  placeholder?: string
  className?: string
  rows?: number
}

const MENTION_REGEX = /(^|\s)@([^\s@]*)$/

export function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  rows = 3,
}: MentionInputProps) {
  const workspaceId = useAuthStore(s => s.workspace?.id)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([])
  const [highlightIndex, setHighlightIndex] = useState(0)

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['workspace', workspaceId, 'members'],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/members`)
      return res.data.data as Member[]
    },
    enabled: !!workspaceId,
  })

  const mentionMatch = value.match(MENTION_REGEX)
  const mentionQuery = mentionMatch?.[2] ?? null

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return members
      .filter(m => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 6)
  }, [mentionQuery, members])

  const showDropdown = mentionCandidates.length > 0

  useEffect(() => {
    setHighlightIndex(0)
  }, [mentionQuery])

  useEffect(() => {
    if (showDropdown && listRef.current) {
      const active = listRef.current.children[highlightIndex] as HTMLElement | undefined
      active?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex, showDropdown])

  const insertMention = (member: Member) => {
    const newValue = value.replace(MENTION_REGEX, `$1@${member.name} `)
    const newIds = mentionUserIds.includes(member.user_id)
      ? mentionUserIds
      : [...mentionUserIds, member.user_id]
    setMentionUserIds(newIds)
    onChange(newValue, newIds)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, mentionCandidates.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertMention(mentionCandidates[highlightIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onChange(value, mentionUserIds)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value, mentionUserIds)
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={clsx(
          'w-full rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]',
          'border border-[var(--color-glass-border)] transition-all duration-150',
          'focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]',
          'p-3 text-sm resize-y min-h-[80px]',
          className,
        )}
      />
      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 bottom-full mb-1 z-50 max-h-40 overflow-y-auto rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] shadow-lg"
        >
          {mentionCandidates.map((member, i) => (
            <li
              key={member.user_id}
              onClick={() => insertMention(member)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors',
                i === highlightIndex
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
              )}
            >
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium text-white shrink-0">
                  {member.name[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{member.name}</div>
                <div className="truncate text-xs opacity-70">{member.email}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

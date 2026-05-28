/**
 * EmailPage — full inbox UI with thread list, thread view, compose, and account setup.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  type EmailAccount,
  type EmailThread,
  listAccounts,
  listThreads,
  getThread,
  updateThread,
  sendEmail,
} from '@/lib/email'
import {
  Mail, Plus, RefreshCw, Search, Star, Archive, Inbox,
  Loader2, Settings2, Send, ChevronRight, X, Reply, CheckSquare,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import AccountSetupModal from '@/components/email/AccountSetupModal'
import ComposeModal from '@/components/email/ComposeModal'
import ThreadView from '@/components/email/ThreadView'
import { Button, Input } from '@/components/ui'

type Folder = 'unread' | 'read' | 'archived' | 'all'

export default function EmailPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id ?? ''
  const qc = useQueryClient()

  const [folder, setFolder]         = useState<Folder>('unread')
  const [search, setSearch]         = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSetup, setShowSetup]   = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string | 'all'>('all')
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['email-accounts', wid],
    queryFn: () => listAccounts(wid),
    enabled: !!wid,
  })

  const { data: threadsResp, isLoading: loadingThreads, refetch } = useQuery({
    queryKey: ['email-threads', wid, folder, search, selectedAccount],
    queryFn: () => listThreads(wid, {
      status:     folder === 'all' ? undefined : folder,
      search:     search || undefined,
      account_id: selectedAccount === 'all' ? undefined : selectedAccount,
    }),
    enabled: !!wid,
    refetchInterval: 60_000,
  })
  const threads = threadsResp?.data ?? []

  const archiveMutation = useMutation({
    mutationFn: (id: string) => updateThread(wid, id, { status: 'archived' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-threads', wid] }),
  })

  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      updateThread(wid, id, { is_starred: starred }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-threads', wid] }),
  })

  if (!wid) return null

  const hasAccounts = accounts.length > 0

  const handleComposeClick = () => {
    if (!hasAccounts) setShowSetup(true)
    else setShowCompose(true)
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--color-bg-deepest)' }}>
      {/* Left sidebar */}
      <div
        className="w-52 flex flex-col shrink-0 border-r"
        style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-glass-border)' }}
      >
        <div className="p-3 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
          <Button size="sm" onClick={handleComposeClick} className="!w-full !justify-center">
            <Plus size={14} /> Compose
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {([
            ['unread',   'Unread',   Inbox],
            ['all',      'All Mail', Mail],
            ['archived', 'Archive',  Archive],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => { setFolder(key); setSelectedId(null) }}
              className={clsx(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
                folder === key
                  ? 'text-[var(--color-accent-text)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]',
              )}
              style={folder === key ? { background: 'var(--color-accent-light)' } : undefined}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: 'var(--color-glass-border)' }}>
          <p className="text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Accounts</p>
          {loadingAccounts ? (
            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          ) : accounts.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No accounts</p>
          ) : (
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedAccount('all')}
                className={clsx('w-full text-left text-xs px-2 py-1 rounded transition-colors',
                  selectedAccount === 'all'
                    ? 'font-medium'
                    : 'hover:bg-[var(--color-bg-hover)]'
                )}
                style={selectedAccount === 'all'
                  ? { color: 'var(--color-text-primary)', background: 'var(--color-bg-hover)' }
                  : { color: 'var(--color-text-muted)' }
                }
              >
                All accounts
              </button>
              {accounts.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAccount(a.id)}
                  className={clsx('w-full text-left text-xs px-2 py-1 rounded truncate transition-colors',
                    selectedAccount === a.id ? 'font-medium' : 'hover:bg-[var(--color-bg-hover)]'
                  )}
                  style={selectedAccount === a.id
                    ? { color: 'var(--color-text-primary)', background: 'var(--color-bg-hover)' }
                    : { color: 'var(--color-text-muted)' }
                  }
                  title={a.email_address}
                >
                  {a.name}
                  {a.status === 'error' && (
                    <span className="ml-1" style={{ color: 'var(--color-status-blocked)' }}>!</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowSetup(true)}
            className="mt-2 w-full flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Settings2 size={11} /> Add account
          </button>
        </div>
      </div>

      {/* Thread list */}
      <div
        className="w-72 flex flex-col shrink-0 border-r"
        style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-glass-border)' }}
      >
        <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-glass-border)' }}>
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none"
              style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-glass-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-auto" style={{ background: 'var(--color-bg-base)' }}>
          {loadingThreads ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <Mail size={24} />
              <p className="text-xs">{hasAccounts ? 'No messages' : 'Add an account to get started'}</p>
            </div>
          ) : (
            threads.map(thread => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                selected={selectedId === thread.id}
                onClick={() => setSelectedId(thread.id)}
                onStar={() => starMutation.mutate({ id: thread.id, starred: !thread.is_starred })}
                onArchive={() => archiveMutation.mutate(thread.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Thread view */}
      <div className="flex-1 overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
        {selectedId ? (
          <ThreadView
            workspaceId={wid}
            threadId={selectedId}
            accounts={accounts}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--color-text-muted)' }}>
            <Mail size={40} className="opacity-40" />
            <p className="text-sm">Select a message to read</p>
          </div>
        )}
      </div>

      {showSetup && (
        <AccountSetupModal
          workspaceId={wid}
          onClose={() => setShowSetup(false)}
        />
      )}
      {showCompose && accounts.length > 0 && (
        <ComposeModal
          workspaceId={wid}
          accounts={accounts}
          onClose={() => setShowCompose(false)}
        />
      )}
    </div>
  )
}

function ThreadListItem({
  thread,
  selected,
  onClick,
  onStar,
  onArchive,
}: {
  thread: EmailThread
  selected: boolean
  onClick: () => void
  onStar: () => void
  onArchive: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'group px-3 py-3 cursor-pointer transition-colors'
      )}
      style={{
        borderBottom: '1px solid var(--color-glass-border)',
        background: selected
          ? 'var(--color-accent-light)'
          : thread.status === 'unread'
            ? 'var(--color-bg-surface)'
            : undefined,
        borderLeft: selected ? '2px solid var(--color-accent)' : undefined,
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <p
              className={clsx('text-xs truncate', thread.status === 'unread' && 'font-semibold')}
              style={{ color: thread.status === 'unread' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
            >
              {thread.emails?.[0]?.from_name || thread.emails?.[0]?.from_address || '—'}
            </p>
            {thread.last_message_at && (
              <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
              </span>
            )}
          </div>
          <p
            className="text-xs truncate"
            style={{ color: thread.status === 'unread' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
          >
            {thread.subject}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onStar() }}
          className={clsx('p-0.5 rounded transition-colors', thread.is_starred ? 'text-yellow-400' : 'hover:text-yellow-400')}
          style={{ color: thread.is_starred ? undefined : 'var(--color-text-muted)' }}
          title="Star"
        >
          <Star size={11} fill={thread.is_starred ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onArchive() }}
          className="p-0.5 rounded transition-colors hover:text-gray-400"
          style={{ color: 'var(--color-text-muted)' }}
          title="Archive"
        >
          <Archive size={11} />
        </button>
      </div>
    </div>
  )
}

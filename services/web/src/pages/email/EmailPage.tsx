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

  // Small UX improvement: when there's no account and user clicks Compose, open setup instead of disabling silently
  const handleComposeClick = () => {
    if (!hasAccounts) setShowSetup(true)
    else setShowCompose(true)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <div className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={handleComposeClick}
            className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} /> Compose
          </button>
        </div>

        {/* Folders */}
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
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>

        {/* Accounts */}
        <div className="p-3 border-t border-gray-800">
          <p className="text-xs text-gray-600 font-medium mb-1.5 uppercase tracking-wide">Accounts</p>
          {loadingAccounts ? (
            <Loader2 size={13} className="animate-spin text-gray-600" />
          ) : accounts.length === 0 ? (
            <p className="text-xs text-gray-600">No accounts</p>
          ) : (
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedAccount('all')}
                className={clsx('w-full text-left text-xs px-2 py-1 rounded transition-colors',
                  selectedAccount === 'all' ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                All accounts
              </button>
              {accounts.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAccount(a.id)}
                  className={clsx('w-full text-left text-xs px-2 py-1 rounded truncate transition-colors',
                    selectedAccount === a.id ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'
                  )}
                  title={a.email_address}
                >
                  {a.name}
                  {a.status === 'error' && (
                    <span className="ml-1 text-red-400">!</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowSetup(true)}
            className="mt-2 w-full flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            <Settings2 size={11} /> Add account
          </button>
        </div>
      </div>

      {/* Thread list */}
      <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-800 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loadingThreads ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-gray-600" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-600 gap-2">
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
      <div className="flex-1 overflow-hidden">
        {selectedId ? (
          <ThreadView
            workspaceId={wid}
            threadId={selectedId}
            accounts={accounts}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-3">
            <Mail size={40} />
            <p className="text-sm">Select a message to read</p>
          </div>
        )}
      </div>

      {/* Modals */}
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

// ── Thread list item ──────────────────────────────────────────────────────────

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
        'group px-3 py-3 border-b border-gray-800 cursor-pointer transition-colors',
        selected ? 'bg-indigo-600/10 border-l-2 border-l-indigo-500' : 'hover:bg-gray-800/50',
        thread.status === 'unread' && !selected && 'bg-gray-900'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <p className={clsx(
              'text-xs truncate',
              thread.status === 'unread' ? 'text-white font-semibold' : 'text-gray-400'
            )}>
              {thread.emails?.[0]?.from_name || thread.emails?.[0]?.from_address || '—'}
            </p>
            {thread.last_message_at && (
              <span className="text-[10px] text-gray-600 shrink-0">
                {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
              </span>
            )}
          </div>
          <p className={clsx(
            'text-xs truncate',
            thread.status === 'unread' ? 'text-gray-200' : 'text-gray-500'
          )}>
            {thread.subject}
          </p>
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onStar() }}
          className={clsx(
            'p-0.5 rounded transition-colors',
            thread.is_starred ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'
          )}
          title="Star"
        >
          <Star size={11} fill={thread.is_starred ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onArchive() }}
          className="p-0.5 rounded text-gray-600 hover:text-gray-400 transition-colors"
          title="Archive"
        >
          <Archive size={11} />
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type EmailAccount, getThread, sendEmail, approveSuggestion, rejectSuggestion, type Email } from '@/lib/email'
import {
  X, Reply, Loader2, ChevronDown, ChevronUp, Sparkles,
  CheckSquare, XCircle, Send, Paperclip, ArrowDown, ArrowUp,
  Mail, Forward, MoreHorizontal,
} from 'lucide-react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

import { Button, Badge, MentionInput } from '@/components/ui'

interface Props {
  workspaceId: string
  threadId: string
  accounts: EmailAccount[]
  onClose: () => void
}

export default function ThreadView({ workspaceId, threadId, accounts, onClose }: Props) {
  const qc = useQueryClient()
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [replyMentionIds, setReplyMentionIds] = useState<string[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showAllHeaders, setShowAllHeaders] = useState<Set<string>>(new Set())

  const { data: thread, isLoading } = useQuery({
    queryKey: ['email-thread', workspaceId, threadId],
    queryFn: () => getThread(workspaceId, threadId),
  })

  const emails: Email[] = (thread?.emails ?? []) as Email[]
  const account = accounts.find(a => a.id === thread?.email_account_id)

  const sendMutation = useMutation({
    mutationFn: () => sendEmail(workspaceId, {
      account_id: account?.id ?? accounts[0]?.id,
      to: emails[0] ? [emails[0].from_address] : [],
      subject: `Re: ${thread?.subject ?? ''}`,
      body_html: `<p>${replyBody.replace(/\n/g, '<br/>')}</p>`,
      thread_id: threadId,
    }),
    onSuccess: () => {
      toast.success('Reply sent.')
      setReplyOpen(false)
      setReplyBody('')
      setReplyMentionIds([])
      qc.invalidateQueries({ queryKey: ['email-thread', workspaceId, threadId] })
      qc.invalidateQueries({ queryKey: ['email-threads', workspaceId] })
    },
    onError: () => toast.error('Send failed.'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveSuggestion(workspaceId, id),
    onSuccess: () => {
      toast.success('Suggestion approved.')
      qc.invalidateQueries({ queryKey: ['email-thread', workspaceId, threadId] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectSuggestion(workspaceId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-thread', workspaceId, threadId] }),
  })

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleHeaders = (id: string) => {
    setShowAllHeaders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const dateLabel = (iso: string | null | undefined) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`
    if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`
    return format(d, 'EEE, MMM d, yyyy · h:mm a')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    )
  }

  if (!thread) return null

  const sorted = [...emails].sort((a, b) =>
    new Date(a.received_at ?? 0).getTime() - new Date(b.received_at ?? 0).getTime()
  )

  let lastDate: string | null = null

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-bg-deepest)' }}>
      {/* Header — real email app bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-bg-surface)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-accent-light)' }}>
          <Mail size={15} style={{ color: 'var(--color-accent-text)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{thread.subject}</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {emails.length} message{emails.length !== 1 ? 's' : ''} · {account?.email_address ?? 'inbox'}
          </p>
        </div>
        <Button size="sm" variant="secondary">
          <Forward size={12} /> Forward
        </Button>
        <Button size="sm" onClick={() => setReplyOpen(v => !v)}>
          <Reply size={12} /> Reply
        </Button>
        <button
          onClick={onClose}
          aria-label="Close thread"
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
          {sorted.map((email, i) => {
            const isCollapsed = i < sorted.length - 1 && !expandedIds.has(email.id)
            const showHeaders = !isCollapsed || showAllHeaders.has(email.id)
            const dateKey = email.received_at ? new Date(email.received_at).toDateString() : null
            const showDateDivider = dateKey && dateKey !== lastDate
            if (dateKey) lastDate = dateKey
            const isMine = account && email.from_address === account.email_address

            return (
              <div key={email.id} className="space-y-2">
                {showDateDivider && (
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px" style={{ background: 'var(--color-glass-border)' }} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      {dateLabel(email.received_at)}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--color-glass-border)' }} />
                  </div>
                )}

                <article
                  className={clsx(
                    'rounded-xl transition-all',
                    isCollapsed && 'cursor-pointer hover:translate-y-[-1px]'
                  )}
                  style={{
                    border: '1px solid var(--color-glass-border)',
                    background: 'var(--color-bg-surface)',
                  }}
                  onClick={isCollapsed ? () => toggleExpand(email.id) : undefined}
                >
                  {/* Email header — RFC-style */}
                  <header
                    className="px-5 py-3 border-b"
                    style={{ borderColor: 'var(--color-glass-border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                        style={{
                          background: isMine ? 'var(--color-accent)' : 'var(--color-accent-light)',
                          color: isMine ? 'white' : 'var(--color-accent-text)',
                        }}
                      >
                        {(email.from_name ?? email.from_address)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {email.from_name ?? email.from_address}
                          </p>
                          {isMine && <Badge variant="success" size="sm">You</Badge>}
                          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                            &lt;{email.from_address}&gt;
                          </span>
                          <span className="ml-auto text-[11px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                            {dateLabel(email.received_at)}
                          </span>
                        </div>
                        {showHeaders && (
                          <div className="mt-1 space-y-0.5 text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                            {email.to_addresses && email.to_addresses.length > 0 && (
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-semibold uppercase tracking-wider text-[9px] w-8 shrink-0">To</span>
                                <span className="truncate">{email.to_addresses.join(', ')}</span>
                              </div>
                            )}
                            {email.cc_addresses && email.cc_addresses.length > 0 && (
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-semibold uppercase tracking-wider text-[9px] w-8 shrink-0">Cc</span>
                                <span className="truncate">{email.cc_addresses.join(', ')}</span>
                              </div>
                            )}
                            {email.subject && i === 0 && (
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-semibold uppercase tracking-wider text-[9px] w-8 shrink-0">Subj</span>
                                <span className="truncate">{email.subject}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {!showHeaders && i < sorted.length - 1 && (
                          <p className="mt-1 text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {email.body_text?.slice(0, 140) || '(no preview)'}
                          </p>
                        )}
                      </div>
                      {i < sorted.length - 1 && !isCollapsed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(email.id) }}
                          className="p-1 rounded text-[10px] flex items-center gap-1 transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                          aria-label="Collapse"
                        >
                          <ChevronUp size={12} /> Hide
                        </button>
                      )}
                      {isCollapsed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(email.id) }}
                          className="p-1 rounded text-[10px] flex items-center gap-1 transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                          aria-label="Expand"
                        >
                          <ChevronDown size={12} /> Show
                        </button>
                      )}
                    </div>
                  </header>

                  {!isCollapsed && (
                    <div className="px-5 py-4">
                      {/* Attachments */}
                      {email.attachments && email.attachments.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {email.attachments.map((att, ai) => (
                            <a
                              key={ai}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
                              style={{
                                background: 'var(--color-bg-input)',
                                border: '1px solid var(--color-glass-border)',
                                color: 'var(--color-text-primary)',
                              }}
                            >
                              <Paperclip size={11} style={{ color: 'var(--color-text-muted)' }} />
                              <span className="truncate max-w-[160px]">{att.filename ?? 'attachment'}</span>
                              {att.size && (
                                <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                                  {(att.size / 1024).toFixed(0)} KB
                                </span>
                              )}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Body */}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {email.body_text ?? '(no content)'}
                      </p>

                      {/* AI suggestions */}
                      {(email.ai_suggestions ?? []).filter(s => s.status === 'pending').length > 0 && (
                        <div className="mt-4 space-y-2">
                          {email.ai_suggestions!.filter(s => s.status === 'pending').map(s => (
                            <div
                              key={s.id}
                              className="rounded-lg p-3"
                              style={{
                                border: '1px solid var(--color-accent-light)',
                                background: 'var(--color-accent-subtle)',
                              }}
                            >
                              <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles size={12} style={{ color: 'var(--color-accent-text)' }} />
                                <span className="text-xs font-medium capitalize" style={{ color: 'var(--color-accent-text)' }}>
                                  AI {s.type.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs whitespace-pre-wrap mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                                {s.content}
                              </p>
                              {s.extracted_tasks.length > 0 && (
                                <div className="mb-3 space-y-1">
                                  {s.extracted_tasks.map((t, ti) => (
                                    <div key={ti} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                      <CheckSquare size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--color-accent-text)' }} />
                                      <span>{t.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveMutation.mutate(s.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  {approveMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <CheckSquare size={10} />}
                                  Approve
                                </Button>
                                <button
                                  onClick={() => rejectMutation.mutate(s.id)}
                                  disabled={rejectMutation.isPending}
                                  className="flex items-center gap-1 text-xs px-2 py-1 transition-colors disabled:opacity-40"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  <XCircle size={10} /> Dismiss
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick actions for this message */}
                      <div className="mt-4 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--color-glass-border)' }}>
                        <button
                          onClick={() => setReplyOpen(true)}
                          className="text-[11px] flex items-center gap-1 transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Reply size={10} /> Reply
                        </button>
                        <button
                          className="text-[11px] flex items-center gap-1 transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Forward size={10} /> Forward
                        </button>
                        {i < sorted.length - 1 && (
                          <button
                            onClick={() => toggleExpand(email.id)}
                            className="text-[11px] flex items-center gap-1 transition-colors"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            <ArrowUp size={10} /> Collapse
                          </button>
                        )}
                        {i > 0 && (
                          <button
                            onClick={() => toggleExpand(email.id)}
                            className="text-[11px] flex items-center gap-1 transition-colors"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            <ArrowDown size={10} /> Newer
                          </button>
                        )}
                        <span className="ml-auto" />
                        <button
                          className="text-[11px] flex items-center gap-1 transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <MoreHorizontal size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              </div>
            )
          })}
        </div>
      </div>

      {replyOpen && (
        <div className="shrink-0" style={{ borderTop: '1px solid var(--color-glass-border)', background: 'var(--color-bg-surface)' }}>
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Reply to: {emails[emails.length - 1]?.from_address}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Subj: Re: {thread.subject}
              </p>
            </div>
            <MentionInput
              value={replyBody}
              onChange={(val, ids) => { setReplyBody(val); setReplyMentionIds(ids) }}
              placeholder="Write your reply…"
              rows={5}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                <kbd className="px-1.5 py-0.5 rounded text-[10px] mr-1" style={{ background: 'var(--color-bg-input)' }}>⌘</kbd>
                +
                <kbd className="px-1.5 py-0.5 rounded text-[10px] mx-1" style={{ background: 'var(--color-bg-input)' }}>Enter</kbd>
                to send
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setReplyOpen(false); setReplyBody(''); setReplyMentionIds([]) }}
                  className="text-xs px-3 py-1.5 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Cancel
                </button>
                <Button
                  size="sm"
                  onClick={() => sendMutation.mutate()}
                  disabled={!replyBody.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

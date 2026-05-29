import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type EmailAccount, getThread, sendEmail, approveSuggestion, rejectSuggestion } from '@/lib/email'
import {
  X, Reply, Loader2, ChevronDown, ChevronUp, Sparkles,
  CheckSquare, XCircle, Send,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui'

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { data: thread, isLoading } = useQuery({
    queryKey: ['email-thread', workspaceId, threadId],
    queryFn: () => getThread(workspaceId, threadId),
  })

  const emails = thread?.emails ?? []
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    )
  }

  if (!thread) return null

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-bg-deepest)' }}>
      <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-glass-border)' }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{thread.subject}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{thread.message_count} message{thread.message_count !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setReplyOpen(v => !v)}>
          <Reply size={12} /> Reply
        </Button>
        <button
          onClick={onClose}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {emails.map((email, i) => {
          const isExpanded = expandedIds.has(email.id) || i === emails.length - 1
          return (
            <div
              key={email.id}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--color-glass-border)' }}
            >
              <div
                onClick={() => toggleExpand(email.id)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                style={{ background: 'var(--color-bg-surface)' }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                  {(email.from_name ?? email.from_address)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {email.from_name ?? email.from_address}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {email.from_address}
                    {email.received_at && ` · ${format(new Date(email.received_at), 'MMM d, h:mm a')}`}
                  </p>
                </div>
                {isExpanded ? <ChevronUp size={13} style={{ color: 'var(--color-text-muted)' }} className="shrink-0" /> : <ChevronDown size={13} style={{ color: 'var(--color-text-muted)' }} className="shrink-0" />}
              </div>

              {isExpanded && (
                <div className="px-4 py-4" style={{ background: 'var(--color-bg-deepest)' }}>
                  {email.body_html ? (
                    <div
                      className="prose prose-invert prose-sm max-w-none"
                      style={{ color: 'var(--color-text-secondary)' }}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body_html) }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{email.body_text ?? '(no content)'}</p>
                  )}

                  {(email.ai_suggestions ?? []).filter(s => s.status === 'pending').map(s => (
                    <div key={s.id} className="mt-4 rounded-lg p-3" style={{ border: '1px solid var(--color-accent-light)', background: 'var(--color-accent-subtle)' }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles size={12} style={{ color: 'var(--color-accent-text)' }} />
                        <span className="text-xs font-medium capitalize" style={{ color: 'var(--color-accent-text)' }}>
                          AI {s.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap mb-3" style={{ color: 'var(--color-text-secondary)' }}>{s.content}</p>
                      {s.extracted_tasks.length > 0 && (
                        <div className="mb-3 space-y-1">
                          {s.extracted_tasks.map((t, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
            </div>
          )
        })}
      </div>

      {replyOpen && (
        <div className="shrink-0" style={{ borderTop: '1px solid var(--color-glass-border)', background: 'var(--color-bg-surface)' }}>
          <div className="p-4">
            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Write your reply…"
              rows={4}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
              style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-glass-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => setReplyOpen(false)}
                className="text-xs transition-colors"
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
      )}
    </div>
  )
}

/**
 * ThreadView — full thread reading pane with emails and AI panel.
 */
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
        <Loader2 size={24} className="animate-spin text-gray-600" />
      </div>
    )
  }

  if (!thread) return null

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{thread.subject}</p>
          <p className="text-xs text-gray-500">{thread.message_count} message{thread.message_count !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setReplyOpen(v => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
        >
          <Reply size={12} /> Reply
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {emails.map((email, i) => {
          const isExpanded = expandedIds.has(email.id) || i === emails.length - 1
          return (
            <div
              key={email.id}
              className="border border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Email header */}
              <div
                onClick={() => toggleExpand(email.id)}
                className="flex items-center gap-3 px-4 py-3 bg-gray-900 cursor-pointer hover:bg-gray-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 text-xs font-medium shrink-0">
                  {(email.from_name ?? email.from_address)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {email.from_name ?? email.from_address}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {email.from_address}
                    {email.received_at && ` · ${format(new Date(email.received_at), 'MMM d, h:mm a')}`}
                  </p>
                </div>
                {isExpanded ? <ChevronUp size={13} className="text-gray-600 shrink-0" /> : <ChevronDown size={13} className="text-gray-600 shrink-0" />}
              </div>

              {/* Body */}
              {isExpanded && (
                <div className="px-4 py-4 bg-gray-950">
                  {email.body_html ? (
                    <div
                      className="prose prose-invert prose-sm max-w-none text-gray-300"
                      dangerouslySetInnerHTML={{ __html: email.body_html }}
                    />
                  ) : (
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{email.body_text ?? '(no content)'}</p>
                  )}

                  {/* AI Suggestions */}
                  {(email.ai_suggestions ?? []).filter(s => s.status === 'pending').map(s => (
                    <div key={s.id} className="mt-4 border border-indigo-500/30 rounded-lg p-3 bg-indigo-600/5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles size={12} className="text-indigo-400" />
                        <span className="text-xs text-indigo-300 font-medium capitalize">
                          AI {s.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap mb-3">{s.content}</p>
                      {s.extracted_tasks.length > 0 && (
                        <div className="mb-3 space-y-1">
                          {s.extracted_tasks.map((t, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                              <CheckSquare size={11} className="mt-0.5 shrink-0 text-indigo-400" />
                              <span>{t.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => approveMutation.mutate(s.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {approveMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <CheckSquare size={10} />}
                          Approve
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(s.id)}
                          disabled={rejectMutation.isPending}
                          className="flex items-center gap-1 text-gray-500 hover:text-gray-300 disabled:opacity-40 text-xs px-2 py-1 transition-colors"
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

      {/* Reply compose */}
      {replyOpen && (
        <div className="border-t border-gray-800 p-4 bg-gray-900 shrink-0">
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Write your reply…"
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => setReplyOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={!replyBody.trim() || sendMutation.isPending}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              {sendMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

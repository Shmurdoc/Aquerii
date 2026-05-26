/**
 * ComposeModal — new email compose window.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type EmailAccount, sendEmail } from '@/lib/email'
import { X, Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  workspaceId: string
  accounts: EmailAccount[]
  onClose: () => void
}

export default function ComposeModal({ workspaceId, accounts, onClose }: Props) {
  const qc = useQueryClient()
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [to, setTo]       = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody]   = useState('')

  const send = useMutation({
    mutationFn: () => sendEmail(workspaceId, {
      account_id: accountId,
      to: to.split(',').map(s => s.trim()).filter(Boolean),
      subject,
      body_html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    }),
    onSuccess: () => {
      toast.success('Email sent.')
      qc.invalidateQueries({ queryKey: ['email-threads', workspaceId] })
      onClose()
    },
    onError: () => toast.error('Send failed.'),
  })

  const canSend = accountId && to.trim() && subject.trim() && body.trim()

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-6 right-6 z-50 w-[520px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <p className="flex-1 text-sm font-semibold text-white">New Message</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          {accounts.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-14 shrink-0">From</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.email_address}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-14 shrink-0">To</label>
            <input
              type="text"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent border-b border-gray-700 pb-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-14 shrink-0">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 bg-transparent border-b border-gray-700 pb-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={8}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-800">
          <button
            onClick={() => send.mutate()}
            disabled={!canSend || send.isPending}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium"
          >
            {send.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Send
          </button>
        </div>
      </div>
    </>
  )
}

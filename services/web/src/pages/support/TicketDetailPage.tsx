import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useTicket, useTicketMessages, useCreateTicketMessage, useUpdateTicket, useAssignTicket, Ticket } from '@/lib/support'
import { ArrowLeft, Send, Loader2, MessageSquare, UserCheck } from 'lucide-react'
import { Button, Input, Badge } from '@/components/ui'

const STATUS_COLORS: Record<string, string> = {
  open: 'text-green-400 bg-green-500/10',
  in_progress: 'text-yellow-400 bg-yellow-500/10',
  resolved: 'text-blue-400 bg-blue-500/10',
  closed: 'text-gray-500 bg-gray-500/10',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400 bg-gray-500/10',
  normal: 'text-blue-400 bg-blue-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  critical: 'text-red-400 bg-red-500/10',
}

export default function TicketDetailPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const { data: ticketData, isLoading } = useTicket(wid, ticketId ?? null)
  const { data: messagesData } = useTicketMessages(wid, ticketId ?? null)
  const updateTicket = useUpdateTicket(wid, ticketId ?? '')
  const addMessage = useCreateTicketMessage(wid, ticketId ?? '')
  const assignTicket = useAssignTicket(wid, ticketId ?? '')

  const ticket = ticketData?.data
  const messages = messagesData?.data ?? []

  const [newMessage, setNewMessage] = useState('')
  const [assignUserId, setAssignUserId] = useState('')

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
  if (!ticket) return <div className="p-6 text-sm text-[var(--color-text-muted)]">Ticket not found.</div>

  const handleChangeStatus = (status: string) => {
    updateTicket.mutate({ status } as any)
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    addMessage.mutate({ body: newMessage.trim(), is_internal: false } as any, {
      onSuccess: () => setNewMessage(''),
    })
  }

  const handleAssign = () => {
    if (!assignUserId.trim()) return
    assignTicket.mutate({ assigned_to: assignUserId.trim() }, { onSuccess: () => setAssignUserId('') })
  }

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/support/tickets')}>
        <ArrowLeft size={12} /> Back to tickets
      </Button>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={ticket.status === 'open' ? 'info' : (ticket.status as string) === 'in_progress' ? 'warning' : ticket.status === 'resolved' ? 'success' : 'default'}>{ticket.status}</Badge>
              <Badge variant={ticket.priority === 'critical' ? 'error' : ticket.priority === 'high' ? 'warning' : 'default'}>{ticket.priority}</Badge>
              {ticket.contact && <span className="text-xs text-[var(--color-text-muted)]">{ticket.contact.name}</span>}
              {ticket.sla_breached_at && <Badge variant="error">SLA breached</Badge>}
            </div>
          </div>
          <div className="flex gap-1 text-xs">
            {['open', 'in_progress', 'resolved', 'closed'].map(s => (
              <button key={s} onClick={() => handleChangeStatus(s)} disabled={ticket.status === s}
                className={`px-2 py-1 rounded transition-colors ${ticket.status === s ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'}`}
              >{s}</button>
            ))}
          </div>
        </div>

        {ticket.description && <p className="text-sm text-[var(--color-text-secondary)]">{ticket.description}</p>}

        <div className="flex items-center gap-2 border-t border-[var(--color-glass-border)] pt-3 text-xs text-[var(--color-text-muted)]">
          <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
          {ticket.assignee && <span>Assigned: {ticket.assignee.name}</span>}
          {ticket.slaPolicy && <span>SLA: {ticket.slaPolicy.name}</span>}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--color-glass-border)] pt-3">
          <Input value={assignUserId} onChange={e => setAssignUserId(e.target.value)} placeholder="User ID to assign" containerClassName="!mb-0" className="!w-56" />
          <Button size="sm" onClick={handleAssign} disabled={!assignUserId.trim()} loading={assignTicket.isPending}>
            <UserCheck size={11} /> Assign
          </Button>
        </div>
      </div>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><MessageSquare size={13} /> Messages</h2>

        {messages.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">No messages yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {messages.map(m => (
              <div key={m.id} className={`bg-[var(--color-bg-elevated)] rounded-lg p-3 ${m.is_internal ? 'border border-yellow-500/20' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">{m.user?.name ?? 'System'}</span>
                  {m.is_internal && <Badge variant="warning">Internal</Badge>}
                  <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{m.body}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-t border-[var(--color-glass-border)] pt-3">
          <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a reply…" rows={2}
            className="flex-1 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] placeholder-[var(--color-text-muted)] resize-none" />
          <Button size="sm" onClick={handleSendMessage} disabled={!newMessage.trim()} loading={addMessage.isPending} className="self-end">
            <Send size={11} /> Send
          </Button>
        </div>
      </div>
    </div>
  )
}

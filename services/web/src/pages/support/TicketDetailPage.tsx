import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useTicket, useTicketMessages, useCreateTicketMessage, useUpdateTicket, useAssignTicket, Ticket } from '@/lib/support'
import { ArrowLeft, Send, Loader2, MessageSquare, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  open: 'text-green-400 bg-green-900/30',
  pending: 'text-yellow-400 bg-yellow-900/30',
  resolved: 'text-blue-400 bg-blue-900/30',
  closed: 'text-gray-500 bg-gray-800',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500 bg-gray-800',
  normal: 'text-blue-400 bg-blue-900/30',
  high: 'text-orange-400 bg-orange-900/30',
  critical: 'text-red-400 bg-red-900/30',
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

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
  if (!ticket) return <div className="p-6 text-sm text-gray-500">Ticket not found.</div>

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
      <button onClick={() => navigate('/support/tickets')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
        <ArrowLeft size={12} /> Back to tickets
      </button>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">{ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
              {ticket.contact && <span className="text-xs text-gray-500">{ticket.contact.name}</span>}
              {ticket.sla_breached_at && <span className="text-[10px] text-red-500">SLA breached</span>}
            </div>
          </div>
          <div className="flex gap-1 text-xs">
            {['open', 'pending', 'resolved', 'closed'].map(s => (
              <button key={s} onClick={() => handleChangeStatus(s)} disabled={ticket.status === s}
                className={`px-2 py-1 rounded ${ticket.status === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >{s}</button>
            ))}
          </div>
        </div>

        {ticket.description && <p className="text-sm text-gray-400">{ticket.description}</p>}

        <div className="flex items-center gap-2 border-t border-gray-800 pt-3 text-xs text-gray-500">
          <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
          {ticket.assignee && <span>Assigned: {ticket.assignee.name}</span>}
          {ticket.slaPolicy && <span>SLA: {ticket.slaPolicy.name}</span>}
        </div>

        <div className="flex items-center gap-2 border-t border-gray-800 pt-3">
          <input value={assignUserId} onChange={e => setAssignUserId(e.target.value)} placeholder="User ID to assign" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none placeholder-gray-600" />
          <button onClick={handleAssign} disabled={!assignUserId.trim()} className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-2 py-1 rounded"><UserCheck size={11} /> Assign</button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><MessageSquare size={13} /> Messages</h2>

        {messages.length === 0 ? (
          <p className="text-xs text-gray-600">No messages yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {messages.map(m => (
              <div key={m.id} className={`bg-gray-800/50 rounded-lg p-3 ${m.is_internal ? 'border border-yellow-900/30' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-300">{m.user?.name ?? 'System'}</span>
                  {m.is_internal && <span className="text-[10px] text-yellow-500">Internal</span>}
                  <span className="text-[10px] text-gray-600 ml-auto">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{m.body}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-t border-gray-800 pt-3">
          <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a reply…" rows={2} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600 resize-none" />
          <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="self-end flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
            <Send size={11} /> Send
          </button>
        </div>
      </div>
    </div>
  )
}

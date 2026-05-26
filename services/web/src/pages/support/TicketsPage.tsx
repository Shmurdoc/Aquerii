import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTickets, useCreateTicket, useDeleteTicket, useUpdateTicket, Ticket } from '@/lib/support'
import { Search, Plus, Loader2, X, MessageSquare, ArrowUpRight, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500 bg-gray-800',
  normal: 'text-blue-400 bg-blue-900/30',
  high: 'text-orange-400 bg-orange-900/30',
  critical: 'text-red-400 bg-red-900/30',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'text-green-400 bg-green-900/30',
  pending: 'text-yellow-400 bg-yellow-900/30',
  resolved: 'text-blue-400 bg-blue-900/30',
  closed: 'text-gray-500 bg-gray-800',
}

export default function TicketsPage() {
  const workspace = useAuthStore(s => s.workspace)
  const navigate = useNavigate()
  const wid = workspace?.id

  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: '', description: '', priority: 'normal' })

  const params: Record<string, string> = {}
  if (statusFilter) params.status = statusFilter
  if (search) params.search = search

  const { data, isLoading } = useTickets(wid, Object.keys(params).length ? params : undefined)
  const tickets = data?.data ?? []
  const createTicket = useCreateTicket(wid)
  const deleteTicket = useDeleteTicket(wid)

  const handleCreate = () => {
    if (!form.subject.trim()) return
    createTicket.mutate(form as any, { onSuccess: () => { setShowForm(false); setForm({ subject: '', description: '', priority: 'normal' }) } })
  }

  if (!workspace) return null

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white flex-1">Tickets</h1>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets…" className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-52" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={12} /> New ticket
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <input placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600 resize-none" />
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button onClick={handleCreate} disabled={!form.subject.trim()} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
              Create ticket
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-600">
          <MessageSquare size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No tickets yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} onDelete={() => deleteTicket.mutate(ticket.id)} onOpen={() => navigate(`/support/tickets/${ticket.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TicketCard({ ticket, onDelete, onOpen }: { ticket: Ticket; onDelete: () => void; onOpen: () => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-4 hover:bg-gray-800/50 transition-colors group">
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-white truncate">{ticket.subject}</h3>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
        </div>
        {ticket.description && <p className="text-xs text-gray-500 line-clamp-1">{ticket.description}</p>}
        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
          {ticket.contact && <span>{ticket.contact.name}</span>}
          {ticket.assignee && <span>Assigned: {ticket.assignee.name}</span>}
          <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
          {ticket.sla_breached_at && <span className="text-red-500">SLA breached</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onOpen} className="p-1 text-gray-600 hover:text-indigo-400 transition-colors" title="Open"><ArrowUpRight size={14} /></button>
        <button onClick={onDelete} className="p-1 text-gray-600 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

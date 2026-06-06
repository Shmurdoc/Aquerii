import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTickets, useCreateTicket, useDeleteTicket, Ticket } from '@/lib/support'
import { Search, Plus, ArrowUpRight, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Button, Input, MentionInput, Select, DataTable, type Column, PrintButton, ExportButton } from '@/components/ui'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-400',
  normal: 'text-blue-400 bg-blue-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  critical: 'text-red-400 bg-red-500/10',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'text-green-400 bg-green-500/10',
  in_progress: 'text-yellow-400 bg-yellow-500/10',
  resolved: 'text-blue-400 bg-blue-500/10',
  closed: 'text-gray-500 bg-gray-500/10',
}

export default function TicketsPage() {
  const workspace = useAuthStore(s => s.workspace)
  const navigate = useNavigate()
  const wid = workspace?.id

  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: '', description: '', priority: 'normal' })
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([])

  const params: Record<string, string> = {}
  if (statusFilter) params.status = statusFilter
  if (search) params.search = search

  const { data, isLoading, refetch } = useTickets(wid, Object.keys(params).length ? params : undefined)
  const tickets = data?.data ?? []
  const createTicket = useCreateTicket(wid)
  const deleteTicket = useDeleteTicket(wid)

  const handleCreate = () => {
    if (!form.subject.trim()) return
    createTicket.mutate({ ...form, mention_user_ids: mentionUserIds } as any, { onSuccess: () => { setShowForm(false); setForm({ subject: '', description: '', priority: 'normal' }); setMentionUserIds([]) } })
  }

  if (!workspace) return null

  const columns: Column<Ticket>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      render: t => (
        <div>
          <span className="font-medium text-[var(--color-text-primary)]">{t.subject}</span>
          {t.description && <p className="text-[10px] text-[var(--color-text-muted)] truncate max-w-xs">{t.description}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: t => (
        <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[t.status])}>{t.status}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: t => (
        <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', PRIORITY_COLORS[t.priority])}>{t.priority}</span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      hideOnMobile: true,
      render: t => t.contact ? (
        <span className="text-xs text-[var(--color-text-secondary)]">{t.contact.name}</span>
      ) : <span className="text-[var(--color-text-muted)]">&mdash;</span>,
    },
    {
      key: 'assignee',
      header: 'Assignee',
      hideOnMobile: true,
      render: t => t.assignee ? (
        <span className="text-xs text-[var(--color-text-secondary)]">{t.assignee.name}</span>
      ) : <span className="text-[var(--color-text-muted)]">&mdash;</span>,
    },
    {
      key: 'sla',
      header: 'SLA',
      hideOnMobile: true,
      render: t => t.sla_breached_at ? (
        <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-medium">Breached</span>
      ) : <span className="text-[var(--color-text-muted)]">&mdash;</span>,
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      hideOnMobile: true,
      render: t => <span className="text-xs text-[var(--color-text-muted)]">{new Date(t.created_at).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16',
      render: t => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" iconOnly onClick={() => navigate(`/support/tickets/${t.id}`)} title="Open">
            <ArrowUpRight size={13} />
          </Button>
          <Button variant="ghost" size="sm" iconOnly onClick={() => { if (confirm('Delete this ticket?')) deleteTicket.mutate(t.id) }} title="Delete">
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[var(--color-glass-border)] flex items-center gap-3 shrink-0">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)] flex-1">Tickets</h1>

        <ExportButton entity="tickets" />
        <PrintButton label="Tickets" />

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets…"
            containerClassName="!mb-0"
            className="!pl-8 !w-52"
          />
        </div>

        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          containerClassName="!mb-0"
          className="!w-32"
          size="sm"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>

        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={13} /> New Ticket
        </Button>
      </div>

      {showForm && (
        <div className="px-6 py-3 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5">Subject</label>
              <Input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Ticket subject"
                containerClassName="!mb-0"
                className="!w-56"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5">Priority</label>
              <Select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                containerClassName="!mb-0"
                className="!w-28"
                size="sm"
              >
                {PRIORITY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!form.subject.trim()}
                loading={createTicket.isPending}
              >
                <Plus size={12} /> Create
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setForm({ subject: '', description: '', priority: 'normal' }); setMentionUserIds([]) }}>
                Cancel
              </Button>
            </div>
          </div>
          <MentionInput
            value={form.description}
            onChange={(val, ids) => { setForm(f => ({ ...f, description: val })); setMentionUserIds(ids) }}
            placeholder="Description (optional)"
            rows={2}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={tickets}
          keyExtractor={t => t.id}
          isLoading={isLoading}
          emptyTitle={search ? 'No tickets match your search.' : 'No tickets yet.'}
          emptyDescription={search ? undefined : 'Create your first ticket to get started.'}
          onRetry={refetch}
        />
      </div>
    </div>
  )
}

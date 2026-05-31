import { useState, useEffect } from 'react'
import { Search, Plus, Play, CheckCircle, XCircle, User } from 'lucide-react'
import { useJobCards, useCreateJobCard, useUpdateJobCard, useDeleteJobCard, useSignOffJobCard, useRejectJobCard } from '@/hooks/useJobCards'
import { JobCard, CreateJobCardPayload, formatDate } from '@/lib/erp'
import { Button, Input, DataTable, type Column } from '@/components/ui'
import StatusBadge from '@/components/erp/StatusBadge'

const STATUSES: Array<{ label: string; value: string }> = [
  { label: 'All', value: '' },
  { label: 'New', value: 'new' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Signed Off', value: 'signed_off' },
  { label: 'Rejected', value: 'rejected' },
]

const PRIORITIES = ['', 'low', 'medium', 'high', 'critical']

function NewJobCardModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [location, setLocation] = useState('')
  const create = useCreateJobCard()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const payload: CreateJobCardPayload = { title, priority: priority as any }
    if (description.trim()) payload.description = description
    if (location.trim()) payload.location = location
    await create.mutateAsync(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit}
        className="bg-[var(--color-bg-deepest)] border border-[var(--color-glass-border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-glass-border)]">
          <h2 className="font-semibold text-[var(--color-text-primary)]">New Job Card</h2>
          <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" aria-label="Close"><Plus size={18} className="rotate-45" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Title *</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:border-[var(--color-accent)]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]">
                {PRIORITIES.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-glass-border)] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={create.isPending} disabled={create.isPending}>Create Job Card</Button>
        </div>
      </form>
    </div>
  )
}

function JobCardDrawer({ card, onClose, onDeleted }: { card: JobCard; onClose: () => void; onDeleted: () => void }) {
  const deleteCard = useDeleteJobCard()
  const updateCard = useUpdateJobCard()
  const signOff = useSignOffJobCard()
  const reject = useRejectJobCard()
  const [rejectReason, setRejectReason] = useState('')

  async function handleDelete() {
    if (!confirm('Delete this job card?')) return
    await deleteCard.mutateAsync(card.id)
    onDeleted()
  }

  async function handleStatusChange(status: string) {
    if (status === 'signed_off') {
      await signOff.mutateAsync({ id: card.id })
    } else if (status === 'rejected') {
      if (!rejectReason.trim()) return
      await reject.mutateAsync({ id: card.id, reason: rejectReason })
    } else {
      await updateCard.mutateAsync({ id: card.id, payload: { status: status as any } })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
      <div className="w-full max-w-lg bg-[var(--color-bg-deepest)] border-l border-[var(--color-glass-border)] h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-glass-border)]">
          <h2 className="font-semibold text-[var(--color-text-primary)]">Job Card</h2>
          <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" aria-label="Close"><Plus size={18} className="rotate-45" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{card.title}</h3>
            {card.description && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{card.description}</p>}
          </div>

          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={card.status} />
            <span className={`text-xs px-2 py-0.5 rounded-full ${card.priority === 'critical' ? 'bg-red-500/20 text-red-400' : card.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : card.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
              {card.priority}
            </span>
          </div>

          {card.assigned_to_user && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <User size={14} /> {card.assigned_to_user.name}
            </div>
          )}

          {card.location && (
            <p className="text-sm text-[var(--color-text-muted)]"><strong>Location:</strong> {card.location}</p>
          )}

          <div className="text-xs text-[var(--color-text-muted)] flex flex-col gap-0.5">
            {card.started_at && <span>Started: {formatDate(card.started_at)}</span>}
            {card.completed_at && <span>Completed: {formatDate(card.completed_at)}</span>}
            {card.signed_off_at && <span>Signed off: {formatDate(card.signed_off_at)}</span>}
          </div>

          {card.tasks && card.tasks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">Checklist</h4>
              <div className="flex flex-col gap-1">
                {card.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <input type="checkbox" checked={task.is_checked} readOnly className="accent-[var(--color-accent)]" />
                    <span className={task.is_checked ? 'line-through opacity-50' : ''}>{task.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {card.status !== 'signed_off' && card.status !== 'rejected' && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Change Status</h4>
              <div className="flex gap-2 flex-wrap">
                {['new', 'in_progress', 'completed'].filter((s) => s !== card.status).map((s) => (
                  <Button key={s} size="xs" variant="outline" onClick={() => handleStatusChange(s)}>
                    {s === 'in_progress' ? <Play size={12} /> : s === 'completed' ? <CheckCircle size={12} /> : null}
                    {s === 'in_progress' ? ' Start' : s === 'completed' ? ' Complete' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>

              {card.status === 'completed' && (
                <div className="flex gap-2 items-center">
                  <Button size="xs" variant="primary" onClick={() => handleStatusChange('signed_off')}>
                    <CheckCircle size={12} /> Sign Off
                  </Button>
                  <input
                    placeholder="Rejection reason..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="flex-1 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <Button size="xs" variant="outline" disabled={!rejectReason.trim()} onClick={() => handleStatusChange('rejected')}>
                    <XCircle size={12} /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}

          {card.rejection_reason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
              <p className="text-xs font-semibold text-red-400">Rejection Reason</p>
              <p className="text-sm text-red-300">{card.rejection_reason}</p>
            </div>
          )}

          {card.signoff_notes && (
            <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
              <p className="text-xs font-semibold text-green-400">Sign-off Notes</p>
              <p className="text-sm text-green-300">{card.signoff_notes}</p>
            </div>
          )}
        </div>

        <div className="mt-auto px-5 py-4 border-t border-[var(--color-glass-border)]">
          <Button variant="danger" size="sm" onClick={handleDelete} loading={deleteCard.isPending}>Delete</Button>
        </div>
      </div>
    </div>
  )
}

export default function JobCardsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const { data: cards = [], isLoading } = useJobCards({
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  })

  const selected = cards.find((c) => c.id === selectedId) ?? null

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (card: any) => (
        <div>
          <p className="text-[var(--color-text-primary)] font-medium">{card.title}</p>
          {card.assigned_to_user && <p className="text-[10px] text-[var(--color-text-muted)]">{card.assigned_to_user.name}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (card: any) => <StatusBadge status={card.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (card: any) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${card.priority === 'critical' ? 'bg-red-500/20 text-red-400' : card.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : card.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
          {card.priority}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      hideOnMobile: true,
      render: (card: any) => <span className="text-xs text-[var(--color-text-muted)]">{card.location || '—'}</span>,
    },
    {
      key: 'created_at',
      header: 'Created',
      hideOnMobile: true,
      render: (card: any) => <span className="text-xs text-[var(--color-text-muted)]">{formatDate(card.created_at)}</span>,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] shrink-0">
        <h1 className="text-base font-semibold text-[var(--color-text-primary)] mr-2">Job Cards</h1>

        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`text-xs px-3 py-1 rounded transition-colors ${statusFilter === s.value ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job cards…"
            containerClassName="!mb-0"
            className="!pl-8 !w-52"
          />
        </div>

        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus size={13} /> New Job Card
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={cards}
          keyExtractor={(card: any) => card.id}
          isLoading={isLoading}
          emptyTitle="No job cards found"
          emptyDescription="Create your first job card to get started."
          onRowClick={(card: any) => setSelectedId(card.id)}
        />
      </div>

      {selected && (
        <JobCardDrawer
          card={selected}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      )}

      {showNew && <NewJobCardModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Play, CheckCircle, XCircle, User, Timer, Camera, Layers, Shield, Trash2, Upload } from 'lucide-react'
import { useJobCards, useCreateJobCard, useUpdateJobCard, useDeleteJobCard, useSignOffJobCard, useRejectJobCard } from '@/hooks/useJobCards'
import { erpJobCards, JobCard, CreateJobCardPayload, formatDate, JobCardMaterial, JobCardTask, JobCardTimeEntry } from '@/lib/erp'
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

const PRIORITIES = ['low', 'medium', 'high', 'critical']

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
                {PRIORITIES.map((p) => (
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

// ─── Photo Capture Section (JOB-09) ────────────────────────────────────────

function PhotoCapture({ cardId, attachments: initialAttachments }: { cardId: string; attachments: JobCard['attachments'] }) {
  const [attachments, setAttachments] = useState(initialAttachments ?? [])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const attachment = await erpJobCards.attachments.upload(cardId, file)
      setAttachments((prev) => [...prev, attachment])
    } catch { /* toast handled by interceptor */ }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(attachmentId: string) {
    await erpJobCards.attachments.delete(cardId, attachmentId)
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-1">
        <Camera size={12} /> Photos & Attachments
      </h4>
      <div className="flex flex-wrap gap-2 mb-2">
        {attachments.map((a) => (
          <div key={a.id} className="relative group w-20 h-20 rounded border border-[var(--color-glass-border)] overflow-hidden">
            {a.mime_type?.startsWith('image/')
              ? <img src={`/storage/${a.filepath}`} alt={a.filename} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--color-text-muted)] p-1 text-center break-all">{a.filename}</div>}
            <button onClick={() => handleDelete(a.id)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={10} className="text-red-400" />
            </button>
          </div>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
      <Button size="xs" variant="outline" onClick={() => fileRef.current?.click()} loading={uploading}>
        <Upload size={11} /> {uploading ? 'Uploading...' : 'Add Photo'}
      </Button>
    </div>
  )
}

// ─── Materials Section (JOB-10) ────────────────────────────────────────────

function MaterialsSection({ cardId, materials: initial }: { cardId: string; materials: JobCardMaterial[] }) {
  const [items, setItems] = useState(initial ?? [])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('0')
  const [unit, setUnit] = useState('')

  async function handleAdd() {
    if (!name.trim() || !qty || !price) return
    try {
      const m = await erpJobCards.materials.add(cardId, {
        name: name.trim(),
        quantity: parseFloat(qty),
        unit_price: parseFloat(price),
        unit: unit.trim() || undefined,
      })
      setItems((prev) => [...prev, m])
      setName(''); setQty('1'); setPrice('0'); setUnit('')
      setShowAdd(false)
    } catch { /* handled */ }
  }

  async function handleDelete(materialId: string) {
    await erpJobCards.materials.delete(cardId, materialId)
    setItems((prev) => prev.filter((m) => m.id !== materialId))
  }

  const total = items.reduce((s, m) => s + m.total, 0)

  return (
    <div>
      <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-1">
        <Layers size={12} /> Materials
      </h4>
      {items.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {items.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] rounded px-2 py-1">
              <span>{m.name}{m.unit ? ` (${m.quantity} ${m.unit})` : ` x${m.quantity}`}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">R{m.total.toFixed(2)}</span>
                <button onClick={() => handleDelete(m.id)} className="text-[var(--color-text-muted)] hover:text-red-400"><Trash2 size={10} /></button>
              </div>
            </div>
          ))}
          <div className="text-xs text-right font-semibold text-[var(--color-text-primary)]">Total: R{total.toFixed(2)}</div>
        </div>
      )}
      {showAdd ? (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-4 gap-1">
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
              className="col-span-2 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-1.5 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none" />
            <input placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-1.5 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <input type="number" step="0.01" min="0.01" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-1.5 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none" />
            <input type="number" step="0.01" min="0" placeholder="Unit price" value={price} onChange={(e) => setPrice(e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-1.5 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none" />
          </div>
          <div className="flex gap-1">
            <Button size="xs" onClick={handleAdd}>Add</Button>
            <Button size="xs" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="xs" variant="outline" onClick={() => setShowAdd(true)}><Plus size={10} /> Add Material</Button>
      )}
    </div>
  )
}

// ─── Timer / Labour Section (JOB-11) ───────────────────────────────────────

function TimerSection({ cardId, timeEntries: initial }: { cardId: string; timeEntries: JobCardTimeEntry[] }) {
  const [entries, setEntries] = useState(initial ?? [])
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const startedRef = useRef<string>()

  useEffect(() => {
    const active = entries.find((e) => !e.ended_at)
    if (active) {
      setRunning(true)
      startedRef.current = active.id
      const start = new Date(active.started_at).getTime()
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function handleStart() {
    try {
      const entry = await erpJobCards.timer.start(cardId)
      startedRef.current = entry.id
      setRunning(true)
      const start = new Date(entry.started_at).getTime()
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    } catch { /* handled */ }
  }

  async function handleStop() {
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const entry = await erpJobCards.timer.stop(cardId)
      setEntries((prev) => prev.map((e) => e.id === entry.id ? entry : e))
    } catch { /* handled */ }
    setRunning(false)
    setElapsed(0)
  }

  function fmt(secs: number) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0)

  return (
    <div>
      <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-1">
        <Timer size={12} /> Labour / Time Tracking
      </h4>
      <div className="flex items-center gap-2 mb-2">
        {running ? (
          <>
            <span className="font-mono text-sm text-green-400">{fmt(elapsed)}</span>
            <Button size="xs" variant="danger" onClick={handleStop}><Square size={10} /> Stop</Button>
          </>
        ) : (
          <Button size="xs" variant="outline" onClick={handleStart}><Play size={10} /> Start Timer</Button>
        )}
        <span className="text-[10px] text-[var(--color-text-muted)]">Total: {totalMinutes}m</span>
      </div>
      {entries.filter((e) => e.ended_at).length > 0 && (
        <div className="flex flex-col gap-0.5 max-h-24 overflow-y-auto">
          {entries.filter((e) => e.ended_at).map((e) => (
            <div key={e.id} className="text-[10px] text-[var(--color-text-muted)] flex justify-between">
              <span>{formatDate(e.started_at)}</span>
              <span>{e.duration_minutes}m</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Square({ size }: { size?: number }) {
  return <svg width={size ?? 10} height={size ?? 10} viewBox="0 0 10 10" fill="currentColor"><rect width="10" height="10" rx="1" /></svg>
}

// ─── Safety Checklist Section (JOB-12) ─────────────────────────────────────

function SafetyChecklist({ cardId, tasks: initial, onRefresh }: { cardId: string; tasks: JobCardTask[]; onRefresh: () => void }) {
  const [tasks, setTasks] = useState(initial ?? [])
  const [newDesc, setNewDesc] = useState('')
  const safetyTasks = tasks.filter((t) => t.category === 'safety')

  async function handleToggle(taskId: string, checked: boolean) {
    const updated = await erpJobCards.tasks.toggle(cardId, taskId, checked)
    setTasks((prev) => prev.map((t) => t.id === taskId ? updated : t))
  }

  async function handleAdd() {
    if (!newDesc.trim()) return
    const task = await erpJobCards.tasks.add(cardId, { description: newDesc.trim(), category: 'safety' })
    setTasks((prev) => [...prev, task])
    setNewDesc('')
  }

  async function handleRemove(taskId: string) {
    await erpJobCards.tasks.remove(cardId, taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-1">
        <Shield size={12} /> Safety Checklist
      </h4>
      <div className="flex flex-col gap-1 mb-2">
        {safetyTasks.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] group">
            <input type="checkbox" checked={t.is_checked} onChange={(e) => handleToggle(t.id, e.target.checked)}
              className="accent-[var(--color-accent)] cursor-pointer" />
            <span className={`flex-1 ${t.is_checked ? 'line-through opacity-50' : ''}`}>{t.description}</span>
            <button onClick={() => handleRemove(t.id)} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-400 transition-opacity">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        {safetyTasks.length === 0 && <p className="text-[10px] text-[var(--color-text-muted)] italic">No safety items yet</p>}
      </div>
      <div className="flex gap-1">
        <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Add safety item..."
          className="flex-1 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <Button size="xs" variant="outline" onClick={handleAdd} disabled={!newDesc.trim()}>Add</Button>
      </div>
    </div>
  )
}

// ─── Main Drawer ───────────────────────────────────────────────────────────

function JobCardDrawer({ card, onClose, onDeleted, onRefresh }: { card: JobCard; onClose: () => void; onDeleted: () => void; onRefresh: () => void }) {
  const deleteCard = useDeleteJobCard()
  const updateCard = useUpdateJobCard()
  const signOff = useSignOffJobCard()
  const reject = useRejectJobCard()
  const [rejectReason, setRejectReason] = useState(card.rejection_reason ?? '')
  const [status, setStatus] = useState(card.status)
  const [currentCard, setCurrentCard] = useState(card)

  async function handleDelete() {
    if (!confirm('Delete this job card?')) return
    await deleteCard.mutateAsync(card.id)
    onDeleted()
  }

  async function handleStatusChange(newStatus: string) {
    if (newStatus === 'signed_off') {
      const updated = await signOff.mutateAsync({ id: card.id })
      setStatus(updated.status)
      setCurrentCard(updated)
    } else if (newStatus === 'rejected') {
      if (!rejectReason.trim()) return
      const updated = await reject.mutateAsync({ id: card.id, reason: rejectReason })
      setStatus(updated.status)
      setCurrentCard(updated)
    } else {
      const updated = await updateCard.mutateAsync({ id: card.id, payload: { status: newStatus as any } })
      setStatus(updated.status)
      setCurrentCard(updated)
    }
    onRefresh()
  }

  const showStatusActions = status !== 'signed_off' && status !== 'rejected'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
      <div className="w-full max-w-lg bg-[var(--color-bg-deepest)] border-l border-[var(--color-glass-border)] h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-glass-border)] shrink-0">
          <h2 className="font-semibold text-[var(--color-text-primary)]">Job Card</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" aria-label="Close"><Plus size={18} className="rotate-45" /></button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{currentCard.title}</h3>
            {currentCard.description && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{currentCard.description}</p>}
          </div>

          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={status} />
            <span className={`text-xs px-2 py-0.5 rounded-full ${currentCard.priority === 'critical' ? 'bg-red-500/20 text-red-400' : currentCard.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : currentCard.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
              {currentCard.priority}
            </span>
          </div>

          {currentCard.assigned_to_user && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <User size={14} /> {currentCard.assigned_to_user.name}
            </div>
          )}

          {currentCard.location && (
            <p className="text-sm text-[var(--color-text-muted)]"><strong>Location:</strong> {currentCard.location}</p>
          )}

          <div className="text-xs text-[var(--color-text-muted)] flex flex-col gap-0.5">
            {currentCard.started_at && <span>Started: {formatDate(currentCard.started_at)}</span>}
            {currentCard.completed_at && <span>Completed: {formatDate(currentCard.completed_at)}</span>}
            {currentCard.signed_off_at && <span>Signed off: {formatDate(currentCard.signed_off_at)}</span>}
          </div>

          {/* Status Change Actions */}
          {showStatusActions && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Change Status</h4>
              <div className="flex gap-2 flex-wrap">
                {['new', 'in_progress', 'completed'].filter((s) => s !== status).map((s) => (
                  <Button key={s} size="xs" variant="outline" onClick={() => handleStatusChange(s)}>
                    {s === 'in_progress' ? <Play size={12} /> : s === 'completed' ? <CheckCircle size={12} /> : null}
                    {s === 'in_progress' ? ' Start' : s === 'completed' ? ' Complete' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
              {status === 'completed' && (
                <div className="flex gap-2 items-center">
                  <Button size="xs" variant="primary" onClick={() => handleStatusChange('signed_off')}>
                    <CheckCircle size={12} /> Sign Off
                  </Button>
                  <input placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    className="flex-1 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none" />
                  <Button size="xs" variant="outline" disabled={!rejectReason.trim()} onClick={() => handleStatusChange('rejected')}>
                    <XCircle size={12} /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}

          {currentCard.rejection_reason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
              <p className="text-xs font-semibold text-red-400">Rejection Reason</p>
              <p className="text-sm text-red-300">{currentCard.rejection_reason}</p>
            </div>
          )}

          {currentCard.signoff_notes && (
            <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
              <p className="text-xs font-semibold text-green-400">Sign-off Notes</p>
              <p className="text-sm text-green-300">{currentCard.signoff_notes}</p>
            </div>
          )}

          <hr className="border-[var(--color-glass-border)]" />

          {/* Safety Checklist (JOB-12) */}
          <SafetyChecklist cardId={card.id} tasks={currentCard.tasks ?? []} onRefresh={onRefresh} />

          <hr className="border-[var(--color-glass-border)]" />

          {/* Photo Capture (JOB-09) */}
          <PhotoCapture cardId={card.id} attachments={currentCard.attachments ?? []} />

          <hr className="border-[var(--color-glass-border)]" />

          {/* Materials Tracking (JOB-10) */}
          <MaterialsSection cardId={card.id} materials={(currentCard as any).materials ?? []} />

          <hr className="border-[var(--color-glass-border)]" />

          {/* Labour / Timer (JOB-11) */}
          <TimerSection cardId={card.id} timeEntries={currentCard.time_entries ?? []} />
        </div>

        <div className="mt-auto px-5 py-4 border-t border-[var(--color-glass-border)]">
          <Button variant="danger" size="sm" onClick={handleDelete} loading={deleteCard.isPending}>Delete Job Card</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function JobCardsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`text-xs px-3 py-1 rounded transition-colors ${statusFilter === s.value ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job cards…" containerClassName="!mb-0" className="!pl-8 !w-52" />
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus size={13} /> New Job Card</Button>
      </div>

      <div className="flex-1 overflow-auto">
        <DataTable columns={columns} data={cards} keyExtractor={(card: any) => card.id}
          isLoading={isLoading} emptyTitle="No job cards found" emptyDescription="Create your first job card to get started."
          onRowClick={(card: any) => setSelectedId(card.id)} />
      </div>

      {selected && (
        <JobCardDrawer card={selected} onClose={() => setSelectedId(null)} onDeleted={() => setSelectedId(null)}
          onRefresh={() => setRefreshKey((k) => k + 1)} />
      )}

      {showNew && <NewJobCardModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

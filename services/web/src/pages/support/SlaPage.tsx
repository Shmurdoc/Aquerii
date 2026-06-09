import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSlas, useCreateSla, useDeleteSla, useUpdateSla, useSlaBreaches, useSlaCompliance, TicketSla } from '@/lib/support'
import { Plus, Trash2, Pencil, X, Check, BarChart3 } from 'lucide-react'
import { Button, Input, Select, Badge } from '@/components/ui'

export default function SlaPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const { data: slasData, isLoading } = useSlas(wid)
  const { data: breachesData } = useSlaBreaches(wid)
  const { data: complianceData } = useSlaCompliance(wid)

  const createSla = useCreateSla(wid)
  const updateSla = useUpdateSla(wid, '')
  const deleteSla = useDeleteSla(wid)

  const slas = slasData?.data ?? []
  const breaches = breachesData?.data ?? []
  const compliance = complianceData?.data

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', priority: 'normal', first_response_hours: 4, resolution_hours: 24, description: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', priority: 'normal', first_response_hours: 4, resolution_hours: 24, description: '' })

  if (!workspace) return null

  const handleCreate = () => {
    if (!form.name.trim()) return
    createSla.mutate(form as any, { onSuccess: () => { setShowForm(false); setForm({ name: '', priority: 'normal', first_response_hours: 4, resolution_hours: 24, description: '' }) } })
  }

  const startEdit = (sla: TicketSla) => {
    setEditingId(sla.id)
    setEditForm({ name: sla.name, priority: sla.priority, first_response_hours: sla.first_response_hours, resolution_hours: sla.resolution_hours, description: sla.description ?? '' })
  }

  const saveEdit = (id: string) => {
    if (!editForm.name.trim()) return
    const mut = updateSla
    mut.mutate({ ...editForm } as any)
    setEditingId(null)
  }

  const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">SLA Policies</h1>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={12} /> New policy
        </Button>
      </div>

      {compliance && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 flex items-center gap-4">
          <BarChart3 size={24} className="text-[var(--color-accent-text)] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">SLA Compliance</p>
            <p className="text-xs text-[var(--color-text-muted)]">{compliance.compliance_pct}% — {compliance.total_tickets - compliance.breached} of {compliance.total_tickets} tickets met SLA</p>
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">{compliance.compliance_pct}%</div>
        </div>
      )}

      {showForm && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
          <Input placeholder="Policy name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} containerClassName="!mb-0" />
          <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} containerClassName="!mb-0" />
          <div className="flex items-center gap-3">
            <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} size="sm" containerClassName="!mb-0 !w-28">
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <span>Response:</span>
              <input type="number" value={form.first_response_hours} onChange={e => setForm(f => ({ ...f, first_response_hours: Number(e.target.value) }))} className="w-14 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none text-center focus:border-[var(--color-accent)]" min={1} />
              <span>h</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <span>Resolution:</span>
              <input type="number" value={form.resolution_hours} onChange={e => setForm(f => ({ ...f, resolution_hours: Number(e.target.value) }))} className="w-14 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none text-center focus:border-[var(--color-accent)]" min={1} />
              <span>h</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!form.name.trim()} loading={createSla.isPending}>Save</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><span className="text-[var(--color-text-muted)] text-sm">Loading…</span></div>
      ) : slas.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No SLA policies defined.</p>
      ) : (
        <div className="space-y-2">
          {slas.map(sla => (
            <div key={sla.id} className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4">
              {editingId === sla.id ? (
                <div className="space-y-2">
                  <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} containerClassName="!mb-0" />
                  <div className="flex items-center gap-2 text-xs">
                    <Select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} size="sm" containerClassName="!mb-0 !w-24">
                      {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                    <input type="number" value={editForm.first_response_hours} onChange={e => setEditForm(f => ({ ...f, first_response_hours: Number(e.target.value) }))} className="w-12 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-1 py-1 text-[var(--color-text-primary)] outline-none text-center focus:border-[var(--color-accent)]" min={1} />
                    <span className="text-[var(--color-text-muted)]">h response</span>
                    <input type="number" value={editForm.resolution_hours} onChange={e => setEditForm(f => ({ ...f, resolution_hours: Number(e.target.value) }))} className="w-12 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-1 py-1 text-[var(--color-text-primary)] outline-none text-center focus:border-[var(--color-accent)]" min={1} />
                    <span className="text-[var(--color-text-muted)]">h resolution</span>
                    <button onClick={() => saveEdit(sla.id)} className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={12} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${sla.is_active ? 'bg-[var(--color-status-done)]' : 'bg-[var(--color-text-muted)]'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{sla.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{sla.priority} · {sla.first_response_hours}h response · {sla.resolution_hours}h resolution</p>
                  </div>
                  <Button variant="ghost" size="sm" iconOnly onClick={() => startEdit(sla)} title="Edit">
                    <Pencil size={12} />
                  </Button>
                  <Button variant="ghost" size="sm" iconOnly onClick={() => deleteSla.mutate(sla.id)} title="Delete">
                    <Trash2 size={12} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2"><BarChart3 size={13} /> Recent Breaches</h2>
        {breaches.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">No breaches recorded.</p>
        ) : (
          <div className="space-y-1">
            {breaches.slice(0, 10).map(b => (
              <div key={b.id} className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-lg px-4 py-2 flex items-center gap-3 text-xs">
                <Badge variant="error">{b.breach_type}</Badge>
                {b.ticket && <span className="text-[var(--color-text-secondary)] flex-1 truncate">{b.ticket.subject}</span>}
                {b.slaPolicy && <span className="text-[var(--color-text-muted)]">{b.slaPolicy.name}</span>}
                <span className="text-[var(--color-text-muted)] shrink-0">{new Date(b.breached_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

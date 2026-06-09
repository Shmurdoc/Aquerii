import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSegments, useCreateSegment, useDeleteSegment, useCalculateSegment, useSegmentPreview, Segment } from '@/lib/marketing'
import { Plus, Users, RefreshCw, Trash2 } from 'lucide-react'
import { Button, Input, Badge } from '@/components/ui'

export default function SegmentsPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', is_dynamic: true })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useSegments(wid)
  const segments = data?.data ?? []
  const createSegment = useCreateSegment(wid)
  const deleteSegment = useDeleteSegment(wid)

  if (!workspace) return null

  const handleCreate = () => {
    if (!form.name.trim()) return
    createSegment.mutate({ ...form, criteria: {} } as any, {
      onSuccess: () => { setShowForm(false); setForm({ name: '', description: '', is_dynamic: true }) },
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)] flex-1">Segments</h1>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={12} /> New segment
        </Button>
      </div>

      {showForm && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
          <Input placeholder="Segment name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} containerClassName="!mb-0" />
          <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} containerClassName="!mb-0" />
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={form.is_dynamic} onChange={e => setForm(f => ({ ...f, is_dynamic: e.target.checked }))} className="accent-[var(--color-accent)]" />
            Dynamic (auto-update)
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!form.name.trim()} loading={createSegment.isPending}>Save</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><span className="text-[var(--color-text-muted)] text-sm">Loading…</span></div>
      ) : segments.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
          <Users size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No segments yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {segments.map(s => (
            <SegmentCard key={s.id} segment={s} expanded={expandedId === s.id} onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} onDelete={() => deleteSegment.mutate(s.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function SegmentCard({ segment: s, expanded, onToggle, onDelete }: {
  segment: Segment; expanded: boolean; onToggle: () => void; onDelete: () => void
}) {
  const workspace = useAuthStore(s => s.workspace)
  const calculate = useCalculateSegment(workspace?.id, s.id)
  const { data: previewData } = useSegmentPreview(workspace?.id, expanded ? s.id : null)
  const [criteria, setCriteria] = useState<Record<string, any>>(s.criteria || {})
  const [editing, setEditing] = useState(false)

  const addCriterion = (key: string, value: any) => {
    setCriteria(c => ({ ...c, [key]: value }))
  }

  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors" onClick={onToggle}>
        <Users size={16} className="text-[var(--color-accent-text)] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{s.name}</p>
            {s.is_dynamic && <Badge variant="info">Dynamic</Badge>}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)] mt-0.5">
            <span>{s.cached_count} contacts</span>
            {s.last_calculated_at && <span>Last calc: {new Date(s.last_calculated_at).toLocaleDateString()}</span>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); calculate.mutate() }} title="Recalculate count">
          <RefreshCw size={11} />
        </Button>
        <Button variant="ghost" size="sm" iconOnly onClick={e => { e.stopPropagation(); onDelete() }} title="Delete">
          <Trash2 size={13} />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-glass-border)] px-4 py-3 space-y-3">
          {s.description && <p className="text-xs text-[var(--color-text-secondary)]">{s.description}</p>}

          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-muted)] font-medium">Criteria</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--color-text-muted)] block mb-1">Lifecycle stages</label>
                <input value={(criteria.lifecycle_stages || []).join(',')} onChange={e => addCriterion('lifecycle_stages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="lead,customer"
                  className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-text-muted)] block mb-1">Sources</label>
                <input value={(criteria.sources || []).join(',')} onChange={e => addCriterion('sources', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="web,referral"
                  className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-text-muted)] block mb-1">Score min</label>
                <input type="number" value={criteria.score_min ?? ''} onChange={e => addCriterion('score_min', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-text-muted)] block mb-1">Score max</label>
                <input type="number" value={criteria.score_max ?? ''} onChange={e => addCriterion('score_max', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" />
              </div>
            </div>
          </div>

          {previewData?.data && previewData.data.length > 0 && (
            <div>
              <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Preview (first {previewData.data.length})</p>
              <div className="space-y-1">
                {previewData.data.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] rounded px-2 py-1">
                    <span>{c.first_name} {c.last_name}</span>
                    <span className="text-[var(--color-text-muted)]">{c.email}</span>
                    {c.lead_score && <span className="ml-auto text-[var(--color-text-secondary)]">Score: {c.lead_score}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button size="sm" variant="secondary" onClick={() => calculate.mutate()}>
            <RefreshCw size={11} /> Recalculate count
          </Button>
        </div>
      )}
    </div>
  )
}

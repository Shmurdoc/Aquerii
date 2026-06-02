import { useState, useMemo } from 'react'
import {
  useHazards, useCreateHazard, useUpdateHazard,
  HAZARD_CATEGORIES, HAZARD_STATUSES, RISK_LEVELS,
  RISK_LEVEL_COLORS, computeRiskScore, computeRiskLevel,
  type Hazard, type HazardCategory, type HazardStatus, type RiskLevel,
} from '@/lib/hsse'
import { Card, Badge, Button, Input, Textarea, Select } from '@/components/ui'
import { Plus, TrendingUp, X } from 'lucide-react'
import clsx from 'clsx'

const CATEGORY_LABELS: Record<HazardCategory, string> = {
  physical: 'Physical', chemical: 'Chemical', biological: 'Biological',
  ergonomic: 'Ergonomic', psychosocial: 'Psychosocial', environmental: 'Environmental',
  mechanical: 'Mechanical', electrical: 'Electrical', other: 'Other',
}

export default function HazardsPage() {
  const [filters, setFilters] = useState<{ status?: HazardStatus; category?: HazardCategory; risk_level?: RiskLevel }>({})
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Hazard | null>(null)
  const { data: hazards, isLoading } = useHazards(filters)
  const create = useCreateHazard()
  const update = useUpdateHazard()

  const sorted = useMemo(
    () => [...(hazards ?? [])].sort((a, b) => b.risk_score - a.risk_score),
    [hazards],
  )

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-orange-400" />
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Risk Register</h1>
        </div>
        <Button onClick={() => setShowCreate(true)} variant="primary">
          <Plus size={14} /> Add Hazard
        </Button>
      </div>

      <div className="flex gap-2 px-6 py-3 border-b border-[var(--color-glass-border)]">
        <Select
          value={filters.category ?? ''}
          onChange={(e) => setFilters({ ...filters, category: (e.target.value || undefined) as HazardCategory })}
          className="text-xs"
        >
          <option value="">All categories</option>
          {HAZARD_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </Select>
        <Select
          value={filters.risk_level ?? ''}
          onChange={(e) => setFilters({ ...filters, risk_level: (e.target.value || undefined) as RiskLevel })}
          className="text-xs"
        >
          <option value="">All risk levels</option>
          {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Select
          value={filters.status ?? ''}
          onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as HazardStatus })}
          className="text-xs"
        >
          <option value="">All statuses</option>
          {HAZARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      <div className="flex-1 px-6 py-4">
        {isLoading ? (
          <p className="text-[var(--color-text-muted)] animate-pulse">Loading...</p>
        ) : !sorted || sorted.length === 0 ? (
          <Card className="p-8 text-center">
            <TrendingUp size={32} className="mx-auto text-zinc-500 mb-2" />
            <p className="text-[var(--color-text-muted)]">No hazards in register</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {sorted.map((h) => (
              <Card key={h.id} className="p-4 hover:border-indigo-500/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">{h.reference}</span>
                      <Badge className={clsx('text-[10px]', RISK_LEVEL_COLORS[h.risk_level])}>
                        {h.risk_level.toUpperCase()} · {h.risk_score}
                      </Badge>
                      <Badge className="text-[10px]">{CATEGORY_LABELS[h.category]}</Badge>
                      <Badge className="text-[10px]">{h.status}</Badge>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{h.title}</p>
                    {h.location && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">📍 {h.location}</p>
                    )}
                    {h.potential_consequence && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        <span className="text-zinc-500">Consequence:</span> {h.potential_consequence}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--color-text-muted)]">
                      <span>L: {h.likelihood}</span>
                      <span>S: {h.severity}</span>
                      {h.residual_risk_level && (
                        <span className="text-emerald-400">Residual: {h.residual_risk_level} ({h.residual_risk_score})</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(h)}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <HazardFormModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (data) => {
            await create.mutateAsync(data)
            setShowCreate(false)
          }}
        />
      )}
      {editing && (
        <HazardFormModal
          hazard={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            await update.mutateAsync({ ...data, id: editing.id })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

interface HazardFormProps {
  hazard?: Hazard
  onClose: () => void
  onSubmit: (data: Partial<Hazard>) => Promise<void>
}

function HazardFormModal({ hazard, onClose, onSubmit }: HazardFormProps) {
  const [form, setForm] = useState<Partial<Hazard>>(hazard ?? {
    title: '', description: '', category: 'physical',
    likelihood: 3, severity: 3, status: 'identified', location: '',
    potential_consequence: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const previewScore = computeRiskScore(form.likelihood ?? 1, form.severity ?? 1)
  const previewLevel = computeRiskLevel(previewScore)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {hazard ? `Edit ${hazard.reference}` : 'Add Hazard'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSubmitting(true)
            try {
              await onSubmit(form)
            } finally {
              setSubmitting(false)
            }
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Title</label>
            <Input
              required
              value={form.title ?? ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Description</label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Category</label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as HazardCategory })}>
                {HAZARD_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Status</label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as HazardStatus })}>
                {HAZARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Likelihood (1-5)</label>
              <Input
                type="number" min={1} max={5}
                value={form.likelihood ?? 1}
                onChange={(e) => setForm({ ...form, likelihood: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Severity (1-5)</label>
              <Input
                type="number" min={1} max={5}
                value={form.severity ?? 1}
                onChange={(e) => setForm({ ...form, severity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Location</label>
              <Input
                value={form.location ?? ''}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Potential Consequence</label>
              <Input
                value={form.potential_consequence ?? ''}
                onChange={(e) => setForm({ ...form, potential_consequence: e.target.value })}
              />
            </div>
          </div>

          <div className={clsx('p-3 rounded-lg border', RISK_LEVEL_COLORS[previewLevel])}>
            <p className="text-xs font-medium">Computed Risk</p>
            <p className="text-lg font-bold">{previewLevel.toUpperCase()} · Score {previewScore}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : hazard ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

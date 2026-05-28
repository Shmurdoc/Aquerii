import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useQuotas, useCreateQuota, useDeleteQuota, useQuotaAttainment } from '@/lib/crm'
import { Plus, Pencil, Trash2, RotateCcw, Loader2, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Input } from '@/components/ui'

export default function QuotasPage() {
  const workspace = useAuthStore(s => s.workspace)
  const { data, isLoading } = useQuotas(workspace?.id)
  const qc = useQueryClient()
  const createQuota = useCreateQuota(workspace?.id)
  const deleteQuota = useDeleteQuota(workspace?.id)
  const computeAttainment = useQuotaAttainment(workspace?.id)
  const updateQuota = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => api.patch(`/workspaces/${workspace!.id}/crm/quotas/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', workspace!.id, 'quotas'] }),
  })

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ user_id: '', period: '', target_amount: 0, currency: 'USD', pipeline_id: '' })

  const quotas = data?.data ?? []

  if (!workspace) return null

  const handleSubmit = () => {
    if (editing) {
      updateQuota.mutate({ id: editing, ...form } as any)
      setEditing(null)
    } else {
      createQuota.mutate(form as any)
    }
    setShowForm(false)
    setForm({ user_id: '', period: '', target_amount: 0, currency: 'USD', pipeline_id: '' })
  }

  const startEdit = (q: any) => {
    setEditing(q.id)
    setForm({ user_id: q.user_id, period: q.period, target_amount: q.target_amount, currency: q.currency, pipeline_id: q.pipeline_id ?? '' })
    setShowForm(true)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Quotas</h1>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ user_id: '', period: '', target_amount: 0, currency: 'USD', pipeline_id: '' }); setShowForm(v => !v) }}>
          <Plus size={12} /> Add quota
        </Button>
      </div>

      {showForm && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-5 gap-3">
            <Input placeholder="User ID" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} containerClassName="!mb-0" />
            <Input placeholder="Period (e.g. 2026-Q2)" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} containerClassName="!mb-0" />
            <Input type="number" placeholder="Target" value={form.target_amount || ''} onChange={e => setForm(f => ({ ...f, target_amount: Number(e.target.value) }))} containerClassName="!mb-0" />
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
              {['USD', 'EUR', 'GBP', 'ZAR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Input placeholder="Pipeline ID (optional)" value={form.pipeline_id} onChange={e => setForm(f => ({ ...f, pipeline_id: e.target.value }))} containerClassName="!mb-0" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!form.user_id || !form.period}>{editing ? 'Update' : 'Save'}</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
      ) : quotas.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
          <Target size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No quotas set.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quotas.map(q => {
            const pct = q.attainment != null ? Math.round(q.attainment * 100) : null
            return (
              <div key={q.id} className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{q.user?.name ?? q.user_id}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{q.period}</span>
                    {q.pipeline && <span className="text-xs text-[var(--color-text-muted)]">{q.pipeline.name}</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-[var(--color-text-secondary)]">${q.target_amount.toLocaleString()} {q.currency}</span>
                    {pct != null && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-24 h-1.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-[var(--color-status-done)]' : pct >= 50 ? 'bg-[var(--color-status-progress)]' : 'bg-[var(--color-status-blocked)]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${pct >= 100 ? 'text-[var(--color-status-done)]' : pct >= 50 ? 'text-[var(--color-status-progress)]' : 'text-[var(--color-status-blocked)]'}`}>{pct}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="sm" iconOnly
                    onClick={() => computeAttainment.mutate(q.id)}
                    disabled={computeAttainment.isPending}
                    title="Compute attainment"
                  >
                    <RotateCcw size={13} />
                  </Button>
                  <Button variant="ghost" size="sm" iconOnly onClick={() => startEdit(q)} title="Edit"><Pencil size={13} /></Button>
                  <Button variant="ghost" size="sm" iconOnly onClick={() => { if (confirm('Delete this quota?')) deleteQuota.mutate(q.id) }} title="Delete"><Trash2 size={13} /></Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

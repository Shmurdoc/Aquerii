import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useQuotas, useCreateQuota, useDeleteQuota, useQuotaAttainment } from '@/lib/crm'
import { Plus, Pencil, Trash2, RotateCcw, Loader2, Target } from 'lucide-react'
import toast from 'react-hot-toast'

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
        <h1 className="text-lg font-semibold text-white">Quotas</h1>
        <button
          onClick={() => { setEditing(null); setForm({ user_id: '', period: '', target_amount: 0, currency: 'USD', pipeline_id: '' }); setShowForm(v => !v) }}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={12} /> Add quota
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-5 gap-3">
            <input placeholder="User ID" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
            <input placeholder="Period (e.g. 2026-Q2)" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
            <input type="number" placeholder="Target" value={form.target_amount || ''} onChange={e => setForm(f => ({ ...f, target_amount: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500">
              {['USD', 'EUR', 'GBP', 'ZAR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Pipeline ID (optional)" value={form.pipeline_id} onChange={e => setForm(f => ({ ...f, pipeline_id: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditing(null) }} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button onClick={handleSubmit} disabled={!form.user_id || !form.period} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : quotas.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-600">
          <Target size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No quotas set.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quotas.map(q => {
            const pct = q.attainment != null ? Math.round(q.attainment * 100) : null
            return (
              <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{q.user?.name ?? q.user_id}</span>
                    <span className="text-xs text-gray-500">{q.period}</span>
                    {q.pipeline && <span className="text-xs text-gray-600">{q.pipeline.name}</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-300">${q.target_amount.toLocaleString()} {q.currency}</span>
                    {pct != null && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${pct >= 100 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => computeAttainment.mutate(q.id)}
                    disabled={computeAttainment.isPending}
                    className="p-1.5 text-gray-600 hover:text-indigo-400 transition-colors"
                    title="Compute attainment"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <button onClick={() => startEdit(q)} className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => { if (confirm('Delete this quota?')) deleteQuota.mutate(q.id) }} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

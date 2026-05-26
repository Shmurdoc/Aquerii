import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSlas, useCreateSla, useDeleteSla, useUpdateSla, useSlaBreaches, useSlaCompliance, TicketSla } from '@/lib/support'
import { Plus, Loader2, Trash2, Pencil, X, Check, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">SLA Policies</h1>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={12} /> New policy
        </button>
      </div>

      {/* Compliance card */}
      {compliance && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
          <BarChart3 size={24} className="text-indigo-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">SLA Compliance</p>
            <p className="text-xs text-gray-500">{compliance.compliance_pct}% — {compliance.total_tickets - compliance.breached} of {compliance.total_tickets} tickets met SLA</p>
          </div>
          <div className="text-2xl font-bold text-white">{compliance.compliance_pct}%</div>
        </div>
      )}

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <input placeholder="Policy name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <div className="flex items-center gap-3">
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>Response:</span>
              <input type="number" value={form.first_response_hours} onChange={e => setForm(f => ({ ...f, first_response_hours: Number(e.target.value) }))} className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white outline-none text-center" min={1} />
              <span>h</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>Resolution:</span>
              <input type="number" value={form.resolution_hours} onChange={e => setForm(f => ({ ...f, resolution_hours: Number(e.target.value) }))} className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white outline-none text-center" min={1} />
              <span>h</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button onClick={handleCreate} disabled={!form.name.trim()} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">Save</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : slas.length === 0 ? (
        <p className="text-sm text-gray-600">No SLA policies defined.</p>
      ) : (
        <div className="space-y-2">
          {slas.map(sla => (
            <div key={sla.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              {editingId === sla.id ? (
                <div className="space-y-2">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white outline-none" />
                  <div className="flex items-center gap-2 text-xs">
                    <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white outline-none">
                      <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                    <input type="number" value={editForm.first_response_hours} onChange={e => setEditForm(f => ({ ...f, first_response_hours: Number(e.target.value) }))} className="w-12 bg-gray-800 border border-gray-700 rounded px-1 py-1 text-white outline-none text-center" min={1} />
                    <span className="text-gray-500">h response</span>
                    <input type="number" value={editForm.resolution_hours} onChange={e => setEditForm(f => ({ ...f, resolution_hours: Number(e.target.value) }))} className="w-12 bg-gray-800 border border-gray-700 rounded px-1 py-1 text-white outline-none text-center" min={1} />
                    <span className="text-gray-500">h resolution</span>
                    <button onClick={() => saveEdit(sla.id)} className="p-1 text-green-400 hover:text-green-300"><Check size={12} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-500 hover:text-gray-300"><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${sla.is_active ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{sla.name}</p>
                    <p className="text-xs text-gray-500">{sla.priority} · {sla.first_response_hours}h response · {sla.resolution_hours}h resolution</p>
                  </div>
                  <button onClick={() => startEdit(sla)} className="p-1 text-gray-600 hover:text-indigo-400 transition-colors"><Pencil size={12} /></button>
                  <button onClick={() => deleteSla.mutate(sla.id)} className="p-1 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Breaches */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><BarChart3 size={13} /> Recent Breaches</h2>
        {breaches.length === 0 ? (
          <p className="text-xs text-gray-600">No breaches recorded.</p>
        ) : (
          <div className="space-y-1">
            {breaches.slice(0, 10).map(b => (
              <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 flex items-center gap-3 text-xs">
                <span className="text-red-400 font-medium">{b.breach_type}</span>
                {b.ticket && <span className="text-gray-300 flex-1 truncate">{b.ticket.subject}</span>}
                {b.slaPolicy && <span className="text-gray-500">{b.slaPolicy.name}</span>}
                <span className="text-gray-600 shrink-0">{new Date(b.breached_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

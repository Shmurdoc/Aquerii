import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSegments, useCreateSegment, useDeleteSegment, useCalculateSegment, useSegmentPreview, Segment } from '@/lib/marketing'
import { Plus, Loader2, Trash2, Users, BarChart3, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'

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
        <h1 className="text-lg font-semibold text-white flex-1">Segments</h1>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={12} /> New segment
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <input placeholder="Segment name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={form.is_dynamic} onChange={e => setForm(f => ({ ...f, is_dynamic: e.target.checked }))} className="rounded" />
            Dynamic (auto-update)
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button onClick={handleCreate} disabled={!form.name.trim()} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">Save</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : segments.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-600">
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={onToggle}>
        <Users size={16} className="text-indigo-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">{s.name}</p>
            {s.is_dynamic && <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">Dynamic</span>}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-0.5">
            <span>{s.cached_count} contacts</span>
            {s.last_calculated_at && <span>Last calc: {new Date(s.last_calculated_at).toLocaleDateString()}</span>}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); calculate.mutate() }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-400 transition-colors px-2 py-1">
          <RefreshCw size={11} /> Count
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-3">
          {s.description && <p className="text-xs text-gray-500">{s.description}</p>}

          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Criteria</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">Lifecycle stages</label>
                <input value={(criteria.lifecycle_stages || []).join(',')} onChange={e => addCriterion('lifecycle_stages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="lead,customer" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">Sources</label>
                <input value={(criteria.sources || []).join(',')} onChange={e => addCriterion('sources', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="web,referral" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">Score min</label>
                <input type="number" value={criteria.score_min ?? ''} onChange={e => addCriterion('score_min', e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">Score max</label>
                <input type="number" value={criteria.score_max ?? ''} onChange={e => addCriterion('score_max', e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none" />
              </div>
            </div>
          </div>

          {previewData?.data && previewData.data.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Preview (first {previewData.data.length})</p>
              <div className="space-y-1">
                {previewData.data.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 rounded px-2 py-1">
                    <span>{c.first_name} {c.last_name}</span>
                    <span className="text-gray-600">{c.email}</span>
                    {c.lead_score && <span className="ml-auto text-gray-500">Score: {c.lead_score}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => calculate.mutate()} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors">
            Recalculate count
          </button>
        </div>
      )}
    </div>
  )
}

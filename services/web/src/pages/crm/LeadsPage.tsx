import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  Search, Plus, Loader2, User, Mail, Phone, Building2,
  Target, TrendingUp, CheckCircle, XCircle, UserCheck,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import {
  useLeads, useCreateLead, useUpdateLead, useDeleteLead,
  useAssignLead, useConvertLead, CrmLead, Pipeline,
} from '@/lib/crm'

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

export default function LeadsPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const [search, setSearch] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newForm, setNewForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '', source: 'manual' })
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null)
  const [assignUserId, setAssignUserId] = useState('')
  const [convertData, setConvertData] = useState({ deal_title: '', deal_value: 0, pipeline_id: '', stage_id: '' })

  const { data: leadsData, isLoading } = useLeads(wid)
  const leads = leadsData?.data ?? []
  const createLead = useCreateLead(wid)

  const { data: pipelinesData } = useQuery<{ data: Pipeline[] }>({
    queryKey: ['crm-pipelines', wid],
    queryFn: () => api.get(`/workspaces/${wid}/crm/pipelines`).then(r => r.data),
    enabled: !!wid,
  })
  const pipelines = pipelinesData?.data ?? []
  const selectedPipeline = pipelines.find(p => p.id === convertData.pipeline_id) ?? pipelines[0]

  const statusColor = (s: string) => {
    switch (s) {
      case 'new': return 'text-blue-400 bg-blue-500/10'
      case 'contacted': return 'text-indigo-400 bg-indigo-500/10'
      case 'qualified': return 'text-purple-400 bg-purple-500/10'
      case 'proposal': return 'text-yellow-400 bg-yellow-500/10'
      case 'won': return 'text-green-400 bg-green-500/10'
      case 'lost': return 'text-red-400 bg-red-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  const filtered = leads.filter(l =>
    !search || `${l.first_name} ${l.last_name} ${l.email ?? ''} ${l.company_name ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3 shrink-0">
        <h1 className="text-sm font-semibold text-white flex-1">Leads</h1>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads…"
            className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56" />
        </div>
        <button onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors">
          <Plus size={13} /> New Lead
        </button>
      </div>

      {/* New lead form */}
      {showNewForm && (
        <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/60 flex items-end gap-3 flex-wrap">
          {(['first_name', 'last_name', 'email', 'phone', 'company_name'] as const).map(f => (
            <div key={f}>
              <label className="text-[10px] text-gray-500 block mb-0.5 capitalize">{f.replace('_', ' ')}</label>
              <input autoFocus={f === 'first_name'} value={newForm[f]} onChange={e => setNewForm(v => ({ ...v, [f]: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36" />
            </div>
          ))}
          <div className="flex gap-2 pb-0.5">
            <button onClick={() => {
              if (!newForm.first_name.trim() || !newForm.last_name.trim()) { toast.error('First and last name required.'); return }
              createLead.mutate(newForm, {
                onSuccess: () => { setShowNewForm(false); setNewForm({ first_name: '', last_name: '', email: '', phone: '', company_name: '', source: 'manual' }) },
                onError: () => toast.error('Failed to create lead.'),
              })
            }} disabled={createLead.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs transition-colors">
              {createLead.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create
            </button>
            <button onClick={() => setShowNewForm(false)} className="px-3 py-1.5 text-gray-400 hover:text-gray-200 text-xs rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-600"><Loader2 size={20} className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-3">
            <Target size={32} className="text-gray-700" />
            <p className="text-sm">{search ? 'No leads match your search.' : 'No leads yet. Add your first one.'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Company</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Score</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-600/20 text-purple-300 flex items-center justify-center text-xs font-semibold shrink-0">
                        {l.first_name?.[0] ?? '?'}
                      </div>
                      <span className="font-medium text-gray-100">{l.first_name} {l.last_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                    {l.email ? <span className="flex items-center gap-1.5"><Mail size={12} className="text-gray-600" />{l.email}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                    {l.company_name ? <span className="flex items-center gap-1.5"><Building2 size={12} className="text-gray-600" />{l.company_name}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', statusColor(l.status))}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{l.score}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedLead(l)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 mr-2">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lead detail / action modal */}
      {selectedLead && (
        <LeadActionModal
          lead={selectedLead}
          workspaceId={wid!}
          pipelines={pipelines}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  )
}

function LeadActionModal({ lead, workspaceId, pipelines, onClose }: {
  lead: CrmLead
  workspaceId: string
  pipelines: Pipeline[]
  onClose: () => void
}) {
  const [tab, setTab] = useState<'details' | 'assign' | 'convert'>('details')
  const [editForm, setEditForm] = useState({ first_name: lead.first_name, last_name: lead.last_name, email: lead.email ?? '', phone: lead.phone ?? '', company_name: lead.company_name ?? '', status: lead.status, notes: lead.notes ?? '' })
  const [assignUserId, setAssignUserId] = useState(lead.assigned_to ?? '')
  const [convertData, setConvertData] = useState({
    deal_title: `${lead.first_name} ${lead.last_name} - ${lead.company_name ?? 'Lead'}`,
    deal_value: 0,
    pipeline_id: pipelines.find(p => p.is_default)?.id ?? pipelines[0]?.id ?? '',
    stage_id: '',
  })

  const updateLead = useUpdateLead(workspaceId, lead.id)
  const deleteLead = useDeleteLead(workspaceId, lead.id)
  const assignLead = useAssignLead(workspaceId, lead.id)
  const convertLeadMutation = useConvertLead(workspaceId, lead.id)

  const selectedPipeline = pipelines.find(p => p.id === convertData.pipeline_id)

  const handleConvert = () => {
    const data: Record<string, unknown> = { deal_title: convertData.deal_title, deal_value: convertData.deal_value }
    if (convertData.pipeline_id) data.pipeline_id = convertData.pipeline_id
    if (convertData.stage_id) data.stage_id = convertData.stage_id
    convertLeadMutation.mutate(data, {
      onSuccess: () => { toast.success('Lead converted!'); onClose() },
      onError: () => toast.error('Conversion failed.'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">{lead.first_name} {lead.last_name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><XCircle size={16} /></button>
        </div>

        <div className="flex gap-1 px-5 pt-3 border-b border-gray-800">
          {(['details', 'assign', 'convert'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors capitalize', tab === t ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300')}>
              {t === 'assign' && <UserCheck size={12} className="inline mr-1" />}
              {t === 'convert' && <TrendingUp size={12} className="inline mr-1" />}
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {tab === 'details' && (
            <>
              {(['first_name', 'last_name', 'email', 'phone', 'company_name', 'status', 'notes'] as const).map(f => (
                <div key={f}>
                  <label className="text-xs text-gray-500 mb-1 block capitalize">{f.replace('_', ' ')}</label>
                  {f === 'notes' ? (
                    <textarea value={editForm[f]} onChange={e => setEditForm(v => ({ ...v, [f]: e.target.value }))} rows={2}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
                  ) : f === 'status' ? (
                    <select value={editForm[f]} onChange={e => setEditForm(v => ({ ...v, [f]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input value={editForm[f]} onChange={e => setEditForm(v => ({ ...v, [f]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={() => updateLead.mutate(editForm, { onError: () => toast.error('Update failed.') })}
                  disabled={updateLead.isPending}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs transition-colors">
                  {updateLead.isPending ? <Loader2 size={12} className="animate-spin" /> : null} Save
                </button>
                <button onClick={() => { if (confirm('Delete this lead?')) deleteLead.mutate(undefined, { onSuccess: onClose }) }}
                  className="px-3 py-1.5 text-gray-400 hover:text-red-400 text-xs rounded-lg hover:bg-gray-800 transition-colors">Delete</button>
              </div>
            </>
          )}

          {tab === 'assign' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Assign to a team member</p>
              <input value={assignUserId} onChange={e => setAssignUserId(e.target.value)} placeholder="User ID…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <button onClick={() => assignLead.mutate({ assigned_to: assignUserId }, {
                onSuccess: () => toast.success('Assigned!'),
                onError: () => toast.error('Assignment failed.'),
              })} disabled={!assignUserId || assignLead.isPending}
                className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs transition-colors">
                {assignLead.isPending ? <Loader2 size={12} className="animate-spin" /> : null} Assign
              </button>
            </div>
          )}

          {tab === 'convert' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Convert this lead to a contact and deal</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Deal Title</label>
                <input value={convertData.deal_title} onChange={e => setConvertData(v => ({ ...v, deal_title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Deal Value</label>
                <input type="number" value={convertData.deal_value} onChange={e => setConvertData(v => ({ ...v, deal_value: Number(e.target.value) }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Pipeline</label>
                <select value={convertData.pipeline_id} onChange={e => setConvertData(v => ({ ...v, pipeline_id: e.target.value, stage_id: '' }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {selectedPipeline && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Stage</label>
                  <select value={convertData.stage_id} onChange={e => setConvertData(v => ({ ...v, stage_id: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Select stage…</option>
                    {selectedPipeline.stages.sort((a, b) => a.position - b.position).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button onClick={handleConvert} disabled={convertLeadMutation.isPending}
                className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-lg text-xs transition-colors">
                {convertLeadMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} className="inline mr-1" />}
                Convert to Deal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

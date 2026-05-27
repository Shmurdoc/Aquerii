import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Plus, DollarSign, ChevronDown, Sparkles, Loader2, User, Building2, Settings2, Pencil, Trash2, Check, X, GripVertical, Trophy, Frown } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import DealDetailModal from '@/components/crm/DealDetailModal'
import { Deal, Pipeline, Stage, CrmContact, CrmCompany, selectPipeline, dealsByStage, stageValue } from '@/lib/crm'

type CRMTab = 'deals' | 'contacts' | 'companies'

// ─── Contacts tab ────────────────────────────────────────────────────────────
function ContactsTab({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' })

  const { data: contacts = [], isLoading } = useQuery<CrmContact[]>({
    queryKey: ['crm-contacts', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/crm/contacts`)
      return res.data.data
    },
  })

  const createContact = useMutation({
    mutationFn: (data: typeof form) =>
      api.post(`/workspaces/${workspaceId}/crm/contacts`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts', workspaceId] })
      setShowAdd(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '' })
      toast.success('Contact added.')
    },
    onError: () => toast.error('Failed to add contact.'),
  })

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{contacts.length} contacts</span>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={12} /> Add contact
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          {(['first_name', 'last_name', 'email', 'phone'] as const).map(field => (
            <input
              key={field}
              placeholder={field.replace('_', ' ')}
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600"
            />
          ))}
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button
              onClick={() => createContact.mutate(form)}
              disabled={createContact.isPending || !form.first_name.trim()}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {createContact.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-600">
          <User size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No contacts yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {contacts.map((c: CrmContact) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 text-sm font-medium shrink-0">
                {c.first_name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{c.first_name} {c.last_name}</p>
                {c.email && <p className="text-xs text-gray-500 truncate">{c.email}</p>}
              </div>
              {c.phone && <span className="text-xs text-gray-500 shrink-0">{c.phone}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Companies tab ───────────────────────────────────────────────────────────
function CompaniesTab({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', domain: '', industry: '' })

  const { data: companies = [], isLoading } = useQuery<CrmCompany[]>({
    queryKey: ['crm-companies', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/crm/companies`)
      return res.data.data
    },
  })

  const createCompany = useMutation({
    mutationFn: (data: typeof form) =>
      api.post(`/workspaces/${workspaceId}/crm/companies`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-companies', workspaceId] })
      setShowAdd(false)
      setForm({ name: '', domain: '', industry: '' })
      toast.success('Company added.')
    },
    onError: () => toast.error('Failed to add company.'),
  })

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{companies.length} companies</span>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={12} /> Add company
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3">
          {(['name', 'domain', 'industry'] as const).map(field => (
            <input
              key={field}
              placeholder={field}
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600"
            />
          ))}
          <div className="col-span-3 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button
              onClick={() => createCompany.mutate(form)}
              disabled={createCompany.isPending || !form.name.trim()}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {createCompany.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-600">
          <Building2 size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No companies yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {companies.map((c: CrmCompany) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 text-sm font-bold shrink-0">
                {c.name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{c.name}</p>
                {c.domain && <p className="text-xs text-gray-500 truncate">{c.domain}</p>}
              </div>
              {c.industry && <span className="text-xs text-gray-500 shrink-0">{c.industry}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main CRM page ────────────────────────────────────────────────────────────
export default function CRMPage() {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()
  const [tab,            setTab]           = useState<CRMTab>('deals')
  const [selectedDeal,   setSelectedDeal]  = useState<Deal | null>(null)
  const [pipelineId,     setPipelineId]    = useState<string | null>(null)
  const [showPipelines,  setShowPipelines] = useState(false)
  const [scoringDeal,    setScoringDeal]   = useState<string | null>(null)
  const [losingDeal,     setLosingDeal]    = useState<Deal | null>(null)
  const [lossReason,     setLossReason]    = useState('')
  const [lossDetails,    setLossDetails]   = useState('')

  const markWon = useMutation({
    mutationFn: (dealId: string) => api.post(`/workspaces/${workspace!.id}/crm/deals/${dealId}/won`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-deals', workspace?.id] }); toast.success('Deal won!') },
    onError: () => toast.error('Failed to mark won'),
  })
  const markLost = useMutation({
    mutationFn: ({ dealId, reason, details }: { dealId: string; reason?: string; details?: string }) =>
      api.post(`/workspaces/${workspace!.id}/crm/deals/${dealId}/lost`, { loss_reason: reason, loss_details: details }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-deals', workspace?.id] }); setLosingDeal(null); toast.success('Deal marked lost') },
    onError: () => toast.error('Failed to mark lost'),
  })

  // Pipeline management
  const [showPipelineManager, setShowPipelineManager] = useState(false)
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null)
  const [editingPipelineName, setEditingPipelineName] = useState('')
  const [newPipelineName, setNewPipelineName] = useState('')
  const [addingPipeline, setAddingPipeline] = useState(false)

  // Stage management
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingStageName, setEditingStageName] = useState('')
  const [editingStageProb, setEditingStageProb] = useState(0)
  const [editingStageColor, setEditingStageColor] = useState('#6366f1')
  const [newStageName, setNewStageName] = useState('')
  const [addingStageFor, setAddingStageFor] = useState<string | null>(null)

  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['crm-pipelines', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/crm/pipelines`)
      return res.data.data
    },
    enabled: !!workspace,
  })

  const pipeline: Pipeline | undefined = selectPipeline(pipelines, pipelineId)

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ['crm-deals', workspace?.id, pipeline?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/crm/deals`, {
        params: { pipeline_id: pipeline!.id },
      })
      return res.data.data
    },
    enabled: !!workspace && !!pipeline && tab === 'deals',
  })

  const createDeal = useMutation({
    mutationFn: (stageId: string) =>
      api.post(`/workspaces/${workspace!.id}/crm/deals`, {
        pipeline_id: pipeline!.id,
        stage_id:    stageId,
        title:       'New Deal',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-deals', workspace?.id, pipeline?.id] }),
    onError:   () => toast.error('Failed to create deal.'),
  })

  const scoreDeal = async (deal: Deal) => {
    setScoringDeal(deal.id)
    try {
      await api.post(`/workspaces/${workspace!.id}/crm/deals/${deal.id}/score`)
      qc.invalidateQueries({ queryKey: ['crm-deals', workspace?.id, pipeline?.id] })
      toast.success('AI score refreshed.')
    } catch {
      toast.error('AI scoring failed.')
    } finally {
      setScoringDeal(null)
    }
  }

  // ── Pipeline mutations ─────────────────────────────────────
  const createPipeline = useMutation({
    mutationFn: (name: string) =>
      api.post(`/workspaces/${workspace!.id}/crm/pipelines`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines', workspace?.id] })
      setAddingPipeline(false)
      setNewPipelineName('')
      toast.success('Pipeline created.')
    },
    onError: () => toast.error('Failed to create pipeline.'),
  })

  const renamePipeline = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/workspaces/${workspace!.id}/crm/pipelines/${id}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines', workspace?.id] })
      setEditingPipelineId(null)
      toast.success('Pipeline renamed.')
    },
    onError: () => toast.error('Failed to rename pipeline.'),
  })

  const deletePipeline = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspace!.id}/crm/pipelines/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines', workspace?.id] })
      toast.success('Pipeline deleted.')
    },
    onError: () => toast.error('Failed to delete pipeline.'),
  })

  // ── Stage mutations ────────────────────────────────────────
  const createStage = useMutation({
    mutationFn: ({ pipelineId, name }: { pipelineId: string; name: string }) =>
      api.post(`/workspaces/${workspace!.id}/crm/pipelines/${pipelineId}/stages`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines', workspace?.id] })
      setAddingStageFor(null)
      setNewStageName('')
      toast.success('Stage added.')
    },
    onError: () => toast.error('Failed to add stage.'),
  })

  const renameStage = useMutation({
    mutationFn: ({ pipelineId, stageId, name, win_probability, color }: {
      pipelineId: string; stageId: string; name: string; win_probability: number; color: string
    }) =>
      api.patch(`/workspaces/${workspace!.id}/crm/pipelines/${pipelineId}/stages/${stageId}`, {
        name, win_probability, color,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines', workspace?.id] })
      setEditingStageId(null)
    },
    onError: () => toast.error('Failed to update stage.'),
  })

  const deleteStage = useMutation({
    mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
      api.delete(`/workspaces/${workspace!.id}/crm/pipelines/${pipelineId}/stages/${stageId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines', workspace?.id] })
      toast.success('Stage deleted.')
    },
    onError: () => toast.error('Failed to delete stage.'),
  })

  if (!workspace) return null

  const stages = [...(pipeline?.stages ?? [])].sort((a, b) => a.position - b.position)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-3 shrink-0">
        {/* Tab switcher */}
        <div className="flex gap-1">
          {(['deals', 'contacts', 'companies'] as CRMTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                tab === t
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              )}
            >
              {t === 'contacts' && <User size={13} />}
              {t === 'companies' && <Building2 size={13} />}
              {t}
            </button>
          ))}
        </div>

        {tab === 'deals' && pipeline && (
          <>
            <span className="text-gray-700 text-sm">|</span>
            {/* Pipeline switcher */}
            <div className="relative">
              <button
                onClick={() => setShowPipelines(v => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-indigo-300 transition-colors"
              >
                {pipeline.name}
                <ChevronDown size={14} className={clsx('transition-transform', showPipelines && 'rotate-180')} />
              </button>
              {showPipelines && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl min-w-[180px] py-1">
                  {pipelines.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setPipelineId(p.id); setShowPipelines(false) }}
                      className={clsx(
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        p.id === pipeline.id
                          ? 'text-indigo-400 bg-indigo-600/10'
                          : 'text-gray-300 hover:bg-gray-800'
                      )}
                    >
                      {p.name}
                      {p.is_default && <span className="ml-2 text-[10px] text-gray-500">default</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowPipelineManager(true)}
              title="Manage pipelines"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-400 transition-colors"
            >
              <Settings2 size={12} /> Manage
            </button>
            <span className="text-xs text-gray-500">{deals.length} deals</span>
            <span className="text-xs text-gray-500">
              ${deals.reduce((s, d) => s + (d.value ?? 0), 0).toLocaleString()} total
            </span>
          </>
        )}
      </div>

      {/* Tab content */}
      {tab === 'contacts' && <ContactsTab workspaceId={workspace.id} />}
      {tab === 'companies' && <CompaniesTab workspaceId={workspace.id} />}

      {tab === 'deals' && (
        <>
          {pipelines.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              No CRM pipeline found.
            </div>
          ) : !pipeline ? null : (
            <div className="flex gap-4 px-6 py-4 overflow-x-auto flex-1 items-start">
              {stages.map(stage => (
                <div key={stage.id} className="flex flex-col min-w-[240px] w-60 shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color ?? '#6366f1' }} />
                      <span className="text-xs font-medium text-gray-300">{stage.name}</span>
                      <span className="text-[10px] text-gray-600 bg-gray-800 rounded-full px-1.5 py-0.5">
                        {dealsByStage(deals, stage.id).length}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">${stageValue(deals, stage.id).toLocaleString()}</span>
                  </div>

                  <div className="flex-1 space-y-2 min-h-[80px] bg-gray-900/40 rounded-xl p-2">
                    {dealsByStage(deals, stage.id).map(deal => (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDeal(deal)}
                        className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-indigo-500/40 transition-colors group"
                      >
                        <p className="text-sm text-gray-100 font-medium truncate">{deal.title}</p>
                        {deal.contact && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{deal.contact.full_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {deal.value != null && (
                            <div className="flex items-center gap-0.5 text-xs text-gray-400">
                              <DollarSign size={10} />
                              {deal.value.toLocaleString()} {deal.currency}
                            </div>
                          )}
                          {deal.ai_score != null ? (
                            <span className={clsx(
                              'text-xs font-medium px-1.5 py-0.5 rounded',
                              deal.ai_score >= 70 ? 'bg-green-500/20 text-green-400' :
                              deal.ai_score >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                            )}>
                              AI: {deal.ai_score}%
                            </span>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); scoreDeal(deal) }}
                              disabled={scoringDeal === deal.id}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-gray-500 hover:text-indigo-400 transition-all"
                            >
                              {scoringDeal === deal.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                              Score
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); markWon.mutate(deal.id) }}
                            disabled={markWon.isPending}
                            className="flex items-center gap-0.5 text-[10px] text-green-500 hover:text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded px-1.5 py-0.5 transition-colors disabled:opacity-40"
                          >
                            <Trophy size={9} /> Won
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setLosingDeal(deal); setLossReason(''); setLossDetails('') }}
                            className="flex items-center gap-0.5 text-[10px] text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded px-1.5 py-0.5 transition-colors"
                          >
                            <Frown size={9} /> Lost
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => createDeal.mutate(stage.id)}
                    disabled={createDeal.isPending}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors mt-1 disabled:opacity-40"
                  >
                    <Plus size={12} /> Add deal
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          workspaceId={workspace.id}
          onClose={() => {
            setSelectedDeal(null)
            qc.invalidateQueries({ queryKey: ['crm-deals'] })
          }}
        />
      )}

      {/* ── Loss Reason Modal ─────────────────────────────────── */}
      {losingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setLosingDeal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white">Mark Deal as Lost</h3>
            <p className="text-xs text-gray-400">{losingDeal.title}</p>
            <select
              value={lossReason}
              onChange={e => setLossReason(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="">Select a reason…</option>
              <option value="budget">Budget</option>
              <option value="timeline">Timeline</option>
              <option value="competitor">Competitor</option>
              <option value="authority">No Authority</option>
              <option value="need">No Need</option>
              <option value="other">Other</option>
            </select>
            <textarea
              placeholder="Details (optional)"
              value={lossDetails}
              onChange={e => setLossDetails(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setLosingDeal(null)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
              <button
                onClick={() => markLost.mutate({ dealId: losingDeal.id, reason: lossReason || undefined, details: lossDetails || undefined })}
                disabled={markLost.isPending}
                className="text-xs bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Mark Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pipeline Management Modal ─────────────────────────── */}
      {showPipelineManager && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16" onClick={() => setShowPipelineManager(false)}>
          <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
          <div
            className="relative z-10 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Manage Pipelines</h2>
              <button onClick={() => setShowPipelineManager(false)} className="text-gray-500 hover:text-gray-300">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {pipelines.map(p => (
                <div key={p.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                  {/* Pipeline header */}
                  <div className="flex items-center gap-2 mb-2">
                    {editingPipelineId === p.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          autoFocus
                          value={editingPipelineName}
                          onChange={e => setEditingPipelineName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') renamePipeline.mutate({ id: p.id, name: editingPipelineName })
                            if (e.key === 'Escape') setEditingPipelineId(null)
                          }}
                          className="flex-1 text-xs bg-gray-800 border border-indigo-500 rounded px-2 py-1 text-white outline-none"
                        />
                        <button onClick={() => renamePipeline.mutate({ id: p.id, name: editingPipelineName })}
                          className="text-green-400 hover:text-green-300"><Check size={11} /></button>
                        <button onClick={() => setEditingPipelineId(null)}
                          className="text-gray-500 hover:text-gray-300"><X size={11} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-white">{p.name}</span>
                        {p.is_default && <span className="text-[10px] text-gray-500 bg-gray-700 rounded px-1.5 py-0.5">default</span>}
                        <button
                          onClick={() => { setEditingPipelineId(p.id); setEditingPipelineName(p.name) }}
                          className="text-gray-500 hover:text-gray-300"
                        >
                          <Pencil size={11} />
                        </button>
                        {!p.is_default && (
                          <button
                            onClick={() => { if (confirm(`Delete pipeline "${p.name}"?`)) deletePipeline.mutate(p.id) }}
                            className="text-gray-500 hover:text-red-400"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Stages */}
                  <div className="space-y-1 ml-2">
                    {[...(p.stages ?? [])].sort((a, b) => a.position - b.position).map(stage => (
                      <div key={stage.id} className="flex items-center gap-2 group/stage">
                        <GripVertical size={11} className="text-gray-600 shrink-0" />
                        {editingStageId === stage.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              autoFocus
                              value={editingStageName}
                              onChange={e => setEditingStageName(e.target.value)}
                              className="flex-1 text-xs bg-gray-800 border border-indigo-500 rounded px-2 py-1 text-white outline-none"
                              placeholder="Stage name"
                            />
                            <input
                              type="number"
                              value={editingStageProb}
                              onChange={e => setEditingStageProb(Number(e.target.value))}
                              className="w-14 text-xs bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white outline-none text-center"
                              min={0} max={100}
                              title="Win probability %"
                            />
                            <input
                              type="color"
                              value={editingStageColor}
                              onChange={e => setEditingStageColor(e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-0 shrink-0"
                              title="Stage color"
                            />
                            <button
                              onClick={() => renameStage.mutate({
                                pipelineId: p.id, stageId: stage.id,
                                name: editingStageName, win_probability: editingStageProb, color: editingStageColor,
                              })}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Check size={11} />
                            </button>
                            <button onClick={() => setEditingStageId(null)}
                              className="text-gray-500 hover:text-gray-300"><X size={11} /></button>
                          </div>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color ?? '#6366f1' }} />
                            <span className="flex-1 text-xs text-gray-400">{stage.name}</span>
                            <span className="text-[10px] text-gray-600">{stage.win_probability}%</span>
                            <button
                              onClick={() => {
                                setEditingStageId(stage.id)
                                setEditingStageName(stage.name)
                                setEditingStageProb(stage.win_probability)
                                setEditingStageColor(stage.color ?? '#6366f1')
                              }}
                              className="opacity-0 group-hover/stage:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity"
                            >
                              <Pencil size={9} />
                            </button>
                            <button
                              onClick={() => { if (confirm('Delete this stage?')) deleteStage.mutate({ pipelineId: p.id, stageId: stage.id }) }}
                              className="opacity-0 group-hover/stage:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                            >
                              <Trash2 size={9} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add stage */}
                    {addingStageFor === p.id ? (
                      <div className="flex items-center gap-1 ml-5">
                        <input
                          autoFocus
                          value={newStageName}
                          onChange={e => setNewStageName(e.target.value)}
                          placeholder="Stage name"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newStageName.trim()) createStage.mutate({ pipelineId: p.id, name: newStageName.trim() })
                            if (e.key === 'Escape') { setAddingStageFor(null); setNewStageName('') }
                          }}
                          className="flex-1 text-xs bg-gray-800 border border-indigo-500 rounded px-2 py-1 text-white outline-none placeholder-gray-600"
                        />
                        <button onClick={() => newStageName.trim() && createStage.mutate({ pipelineId: p.id, name: newStageName.trim() })}
                          className="text-green-400 hover:text-green-300"><Check size={11} /></button>
                        <button onClick={() => { setAddingStageFor(null); setNewStageName('') }}
                          className="text-gray-500 hover:text-gray-300"><X size={11} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingStageFor(p.id)}
                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-indigo-400 transition-colors ml-5 mt-1"
                      >
                        <Plus size={9} /> Add stage
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add pipeline */}
              {addingPipeline ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={newPipelineName}
                    onChange={e => setNewPipelineName(e.target.value)}
                    placeholder="Pipeline name"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newPipelineName.trim()) createPipeline.mutate(newPipelineName.trim())
                      if (e.key === 'Escape') { setAddingPipeline(false); setNewPipelineName('') }
                    }}
                    className="flex-1 text-xs bg-gray-800 border border-indigo-500 rounded px-2 py-1 text-white outline-none placeholder-gray-600"
                  />
                  <button onClick={() => newPipelineName.trim() && createPipeline.mutate(newPipelineName.trim())}
                    className="text-green-400 hover:text-green-300"><Check size={11} /></button>
                  <button onClick={() => { setAddingPipeline(false); setNewPipelineName('') }}
                    className="text-gray-500 hover:text-gray-300"><X size={11} /></button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingPipeline(true)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus size={12} /> Add pipeline
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

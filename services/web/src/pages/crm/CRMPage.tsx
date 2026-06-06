import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Plus, Banknote, ChevronDown, Sparkles, Loader2, User, Building2, Settings2, Pencil, Trash2, Check, X, GripVertical, Trophy, Frown } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import DealDetailModal from '@/components/crm/DealDetailModal'
import { Deal, Pipeline, Stage, CrmContact, CrmCompany, selectPipeline, dealsByStage, stageValue } from '@/lib/crm'
import { formatCurrency } from '@/lib/erp'
import { Button, Input, Card, Modal, Tabs, TabList, Tab, TabPanel, PrintButton, ExportButton } from '@/components/ui'

type CRMTab = 'deals' | 'contacts' | 'companies'

function ContactsTab({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone: '' })

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

  const updateContact = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editForm }) =>
      api.patch(`/workspaces/${workspaceId}/crm/contacts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts', workspaceId] })
      setEditingId(null)
      toast.success('Contact updated.')
    },
    onError: () => toast.error('Failed to update contact.'),
  })

  const deleteContact = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspaceId}/crm/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts', workspaceId] })
      toast.success('Contact deleted.')
    },
    onError: () => toast.error('Failed to delete contact.'),
  })

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--color-text-muted)]">{contacts.length} contacts</span>
        <Button size="sm" onClick={() => setShowAdd(v => !v)}>
          <Plus size={12} /> Add contact
        </Button>
      </div>

      {showAdd && (
        <Card variant="default" className="!rounded-xl mb-4">
          <div className="grid grid-cols-2 gap-3 p-4">
            {(['first_name', 'last_name', 'email', 'phone'] as const).map(field => (
              <Input
                key={field}
                placeholder={field.replace('_', ' ')}
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                containerClassName="!mb-0"
              />
            ))}
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={() => createContact.mutate(form)} disabled={createContact.isPending || !form.first_name.trim()} loading={createContact.isPending}>Save</Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
          <User size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No contacts yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-glass-border)]">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Email</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Company</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Phone</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c: CrmContact) => (
                <tr key={c.id} className="border-b border-[var(--color-glass-border)] hover:bg-[var(--color-bg-hover)] transition-colors group">
                  {editingId === c.id ? (
                    <>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Input size="sm" value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} containerClassName="!mb-0" className="!text-xs" placeholder="First" />
                          <Input size="sm" value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} containerClassName="!mb-0" className="!text-xs" placeholder="Last" />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input size="sm" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} containerClassName="!mb-0" className="!text-xs" />
                      </td>
                      <td className="px-3 py-2 text-sm text-[var(--color-text-muted)]">{c.company?.name ?? '—'}</td>
                      <td className="px-3 py-2">
                        <Input size="sm" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} containerClassName="!mb-0" className="!text-xs" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" iconOnly onClick={() => updateContact.mutate({ id: c.id, data: editForm })}><Check size={12} /></Button>
                          <Button variant="ghost" size="sm" iconOnly onClick={() => setEditingId(null)}><X size={12} /></Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent-text)] text-xs font-medium shrink-0">
                            {c.first_name?.[0] ?? '?'}
                          </div>
                          <span className="text-sm text-[var(--color-text-primary)] font-medium">{c.first_name} {c.last_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">{c.email ?? '—'}</td>
                      <td className="px-3 py-2 text-sm text-[var(--color-text-muted)]">{c.company?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">{c.phone ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" iconOnly onClick={() => { setEditingId(c.id); setEditForm({ first_name: c.first_name, last_name: c.last_name, email: c.email ?? '', phone: c.phone ?? '' }) }}><Pencil size={12} /></Button>
                          <Button variant="ghost" size="sm" iconOnly onClick={() => { if (confirm('Delete this contact?')) deleteContact.mutate(c.id) }}><Trash2 size={12} /></Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CompaniesTab({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', domain: '', industry: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', domain: '', industry: '' })

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

  const updateCompany = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editForm }) =>
      api.patch(`/workspaces/${workspaceId}/crm/companies/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-companies', workspaceId] })
      setEditingId(null)
      toast.success('Company updated.')
    },
    onError: () => toast.error('Failed to update company.'),
  })

  const deleteCompany = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspaceId}/crm/companies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-companies', workspaceId] })
      toast.success('Company deleted.')
    },
    onError: () => toast.error('Failed to delete company.'),
  })

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--color-text-muted)]">{companies.length} companies</span>
        <Button size="sm" onClick={() => setShowAdd(v => !v)}>
          <Plus size={12} /> Add company
        </Button>
      </div>

      {showAdd && (
        <Card variant="default" className="!rounded-xl mb-4">
          <div className="grid grid-cols-3 gap-3 p-4">
            {(['name', 'domain', 'industry'] as const).map(field => (
              <Input
                key={field}
                placeholder={field}
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                containerClassName="!mb-0"
              />
            ))}
            <div className="col-span-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={() => createCompany.mutate(form)} disabled={createCompany.isPending || !form.name.trim()} loading={createCompany.isPending}>Save</Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
          <Building2 size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No companies yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-glass-border)]">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Contacts</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Deals</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c: CrmCompany) => (
                <tr key={c.id} className="border-b border-[var(--color-glass-border)] hover:bg-[var(--color-bg-hover)] transition-colors group">
                  {editingId === c.id ? (
                    <>
                      <td className="px-3 py-2">
                        <Input size="sm" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} containerClassName="!mb-0" className="!text-xs" />
                      </td>
                      <td className="px-3 py-2 text-sm text-[var(--color-text-muted)]">{(c as any).contacts_count ?? 0}</td>
                      <td className="px-3 py-2 text-sm text-[var(--color-text-muted)]">{(c as any).deals_count ?? 0}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" iconOnly onClick={() => updateCompany.mutate({ id: c.id, data: editForm })}><Check size={12} /></Button>
                          <Button variant="ghost" size="sm" iconOnly onClick={() => setEditingId(null)}><X size={12} /></Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[var(--color-bg-elevated)] flex items-center justify-center text-[var(--color-text-muted)] text-xs font-bold shrink-0">
                            {c.name?.[0] ?? '?'}
                          </div>
                          <div>
                            <span className="text-sm text-[var(--color-text-primary)] font-medium">{c.name}</span>
                            {c.domain && <span className="text-xs text-[var(--color-text-muted)] ml-2">{c.domain}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">{(c as any).contacts_count ?? 0}</td>
                      <td className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">{(c as any).deals_count ?? 0}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" iconOnly onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, domain: c.domain ?? '', industry: c.industry ?? '' }) }}><Pencil size={12} /></Button>
                          <Button variant="ghost" size="sm" iconOnly onClick={() => { if (confirm('Delete this company?')) deleteCompany.mutate(c.id) }}><Trash2 size={12} /></Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

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

  const [showPipelineManager, setShowPipelineManager] = useState(false)
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null)
  const [editingPipelineName, setEditingPipelineName] = useState('')
  const [newPipelineName, setNewPipelineName] = useState('')
  const [addingPipeline, setAddingPipeline] = useState(false)

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

  useEffect(() => {
    if (!pipelineId && pipelines.length > 0) {
      const defaultP = selectPipeline(pipelines, null)
      if (defaultP) setPipelineId(defaultP.id)
    }
  }, [pipelines, pipelineId])

  const pipeline: Pipeline | undefined = selectPipeline(pipelines, pipelineId)

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ['crm-deals', workspace?.id, pipeline?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/crm/deals`, {
        params: { pipeline_id: pipeline!.id },
      })
      return res.data.data.data ?? res.data.data
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

  const moveDeal = useMutation({
    mutationFn: ({ dealId, stageId, position }: { dealId: string; stageId: string; position?: number }) =>
      api.post(`/workspaces/${workspace!.id}/crm/deals/${dealId}/move`, { stage_id: stageId, position }),
    onError: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals', workspace?.id, pipeline?.id] })
      toast.error('Failed to move deal.')
    },
  })

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const newStageId = destination.droppableId
    qc.setQueryData<Deal[]>(['crm-deals', workspace?.id, pipeline?.id], old =>
      (old ?? []).map(d => d.id === draggableId ? { ...d, stage_id: newStageId } : d)
    )

    moveDeal.mutate({ dealId: draggableId, stageId: newStageId, position: destination.index })
  }, [workspace?.id, pipeline?.id, qc, moveDeal])

  const reorderStages = useMutation({
    mutationFn: ({ pipelineId, stages }: { pipelineId: string; stages: Array<{ id: string; position: number }> }) =>
      api.post(`/workspaces/${workspace!.id}/crm/pipelines/${pipelineId}/stages/reorder`, { stages }),
    onError: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines', workspace?.id] })
      toast.error('Failed to reorder stages.')
    },
  })

  const onStageDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.index === destination.index) return

    // Extract pipelineId from droppableId ("stage-list-{pipelineId}")
    const pipelineId = source.droppableId.replace('stage-list-', '')
    if (!pipelineId) return

    // Optimistic update — reorder stages in the cached pipeline
    qc.setQueryData<Pipeline[]>(['crm-pipelines', workspace?.id], old =>
      (old ?? []).map(p => {
        if (p.id !== pipelineId) return p
        const sorted = [...(p.stages ?? [])].sort((a, b) => a.position - b.position)
        const [moved] = sorted.splice(source.index, 1)
        if (!moved) return p
        sorted.splice(destination.index, 0, moved)
        const updated = sorted.map((s, i) => ({ ...s, position: i }))
        return { ...p, stages: updated }
      })
    )

    // Build payload for the backend
    const pipeline = qc.getQueryData<Pipeline[]>(['crm-pipelines', workspace?.id])
      ?.find(p => p.id === pipelineId)
    if (!pipeline?.stages) return

    const sorted = [...pipeline.stages].sort((a, b) => a.position - b.position)
    reorderStages.mutate({
      pipelineId,
      stages: sorted.map((s, i) => ({ id: s.id, position: i })),
    })
  }, [workspace?.id, qc, reorderStages])

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
      api.patch(`/workspaces/${workspace!.id}/crm/pipelines/${pipelineId}/stages/${stageId}`, { name, win_probability, color }),
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
      <Tabs value={tab} onValueChange={v => setTab(v as CRMTab)}>
      <div className="px-6 py-3 border-b border-[var(--color-glass-border)] flex items-center gap-3 shrink-0">
          <ExportButton entity="deals" />
          <PrintButton label="Deals" />
          <TabList>
            {(['deals', 'contacts', 'companies'] as CRMTab[]).map(t => (
              <Tab key={t} value={t} icon={t === 'contacts' ? User : t === 'companies' ? Building2 : undefined}>{t}</Tab>
            ))}
          </TabList>

        {tab === 'deals' && pipeline && (
          <>
            <span className="text-[var(--color-glass-border)] text-sm">|</span>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPipelines(v => !v)}
                className="!font-semibold"
              >
                {pipeline.name}
                <ChevronDown size={14} className={clsx('transition-transform', showPipelines && 'rotate-180')} />
              </Button>
              {showPipelines && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl shadow-2xl min-w-[180px] py-1">
                  {pipelines.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setPipelineId(p.id); setShowPipelines(false) }}
                      className={clsx(
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        p.id === pipeline.id
                          ? 'text-[var(--color-accent-text)] bg-[var(--color-accent-light)]'
                          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                      )}
                    >
                      {p.name}
                      {p.is_default && <span className="ml-2 text-[10px] text-[var(--color-text-muted)]">default</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPipelineManager(true)}>
              <Settings2 size={12} /> Manage
            </Button>
            <span className="text-xs text-[var(--color-text-muted)]">{deals.length} deals</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {formatCurrency(deals.reduce((s, d) => s + (d.value ?? 0), 0))} total
            </span>
          </>
        )}
      </div>

      <TabPanel value={tab}>
        {tab === 'contacts' && <ContactsTab workspaceId={workspace.id} />}
        {tab === 'companies' && <CompaniesTab workspaceId={workspace.id} />}

        {tab === 'deals' && (
          <>
            {pipelines.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
                No CRM pipeline found.
              </div>
            ) : !pipeline ? null : (
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 px-6 py-4 overflow-x-auto flex-1 items-start">
                  {stages.map(stage => (
                    <Droppable key={stage.id} droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="flex flex-col min-w-[240px] w-60 shrink-0"
                        >
                          <div className="flex items-center justify-between mb-2 px-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color ?? '#6366f1' }} />
                              <span className="text-xs font-medium text-[var(--color-text-secondary)]">{stage.name}</span>
                              <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] rounded-full px-1.5 py-0.5">
                                {dealsByStage(deals, stage.id).length}
                              </span>
                            </div>
                            <span className="text-xs text-[var(--color-text-muted)]">{formatCurrency(stageValue(deals, stage.id))}</span>
                          </div>

                          <div
                            className="flex-1 space-y-2 min-h-[80px] rounded-xl p-2 transition-colors"
                            style={{ background: snapshot.isDraggingOver ? 'var(--color-accent-light)' : 'var(--color-bg-surface)/40' }}
                          >
                            {dealsByStage(deals, stage.id).map((deal, index) => (
                              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...provided.draggableProps.style,
                                      opacity: snapshot.isDragging ? 0.85 : undefined,
                                    }}
                                  >
                                    <Card
                                      variant="interactive"
                                      padding="sm"
                                      onClick={() => setSelectedDeal(deal)}
                                      className="group"
                                    >
                                      <p className="text-sm text-[var(--color-text-primary)] font-medium truncate">{deal.title}</p>
                                      {deal.contact && (
                                        <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{deal.contact.full_name}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        {deal.value != null && (
                                          <div className="flex items-center gap-0.5 text-xs text-[var(--color-text-secondary)]">
                                            <Banknote size={10} />
                                            {formatCurrency(deal.value, deal.currency)}
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
                                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent-text)] transition-all"
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
                                    </Card>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => createDeal.mutate(stage.id)}
                            disabled={createDeal.isPending}
                            className="!justify-start mt-1"
                          >
                            <Plus size={12} /> Add deal
                          </Button>
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </DragDropContext>
            )}
          </>
        )}
      </TabPanel>

      </Tabs>

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

      <Modal
        open={!!losingDeal}
        onClose={() => setLosingDeal(null)}
        title="Mark Deal as Lost"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setLosingDeal(null)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => markLost.mutate({ dealId: losingDeal!.id, reason: lossReason || undefined, details: lossDetails || undefined })}
              disabled={markLost.isPending}
              loading={markLost.isPending}
            >
              Mark Lost
            </Button>
          </>
        }
      >
        <p className="text-xs text-[var(--color-text-secondary)] mb-3">{losingDeal?.title}</p>
        <select
          value={lossReason}
          onChange={e => setLossReason(e.target.value)}
          className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-3"
        >
          <option value="">Select a reason&hellip;</option>
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
          className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)] resize-none"
        />
      </Modal>

      <Modal
        open={showPipelineManager}
        onClose={() => setShowPipelineManager(false)}
        title="Manage Pipelines"
        size="lg"
      >
        <div className="space-y-4">
          {pipelines.map(p => (
            <div key={p.id} className="bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                {editingPipelineId === p.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      autoFocus
                      value={editingPipelineName}
                      onChange={e => setEditingPipelineName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renamePipeline.mutate({ id: p.id, name: editingPipelineName })
                        if (e.key === 'Escape') setEditingPipelineId(null)
                      }}
                      containerClassName="!mb-0 flex-1"
                      className="!text-xs"
                    />
                    <Button variant="ghost" size="sm" iconOnly onClick={() => renamePipeline.mutate({ id: p.id, name: editingPipelineName })}><Check size={11} /></Button>
                    <Button variant="ghost" size="sm" iconOnly onClick={() => setEditingPipelineId(null)}><X size={11} /></Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">{p.name}</span>
                    {p.is_default && <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-input)] rounded px-1.5 py-0.5">default</span>}
                    <Button variant="ghost" size="sm" iconOnly onClick={() => { setEditingPipelineId(p.id); setEditingPipelineName(p.name) }}><Pencil size={11} /></Button>
                    {!p.is_default && (
                      <Button variant="ghost" size="sm" iconOnly onClick={() => { if (confirm(`Delete pipeline "${p.name}"?`)) deletePipeline.mutate(p.id) }}><Trash2 size={11} /></Button>
                    )}
                  </>
                )}
              </div>

              <DragDropContext onDragEnd={onStageDragEnd}>
                <Droppable droppableId={`stage-list-${p.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-1 ml-2"
                      style={{
                        background: snapshot.isDraggingOver ? 'var(--color-accent-light)' : undefined,
                        borderRadius: snapshot.isDraggingOver ? '8px' : undefined,
                        padding: snapshot.isDraggingOver ? '4px' : undefined,
                      }}
                    >
                      {[...(p.stages ?? [])].sort((a, b) => a.position - b.position).map((stage, index) => (
                        <Draggable key={stage.id} draggableId={stage.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.85 : undefined,
                              }}
                              className="flex items-center gap-2 group/stage"
                            >
                              <div {...provided.dragHandleProps} className="shrink-0 cursor-grab active:cursor-grabbing">
                                <GripVertical size={11} className="text-[var(--color-text-muted)]" />
                              </div>
                              {editingStageId === stage.id ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <Input
                                    autoFocus
                                    value={editingStageName}
                                    onChange={e => setEditingStageName(e.target.value)}
                                    placeholder="Stage name"
                                    containerClassName="!mb-0 flex-1"
                                    className="!text-xs"
                                  />
                                  <input
                                    type="number"
                                    value={editingStageProb}
                                    onChange={e => setEditingStageProb(Number(e.target.value))}
                                    className="w-14 text-xs bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-1 py-1 text-[var(--color-text-primary)] text-center outline-none"
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
                                  <Button variant="ghost" size="sm" iconOnly onClick={() => renameStage.mutate({ pipelineId: p.id, stageId: stage.id, name: editingStageName, win_probability: editingStageProb, color: editingStageColor })}><Check size={11} /></Button>
                                  <Button variant="ghost" size="sm" iconOnly onClick={() => setEditingStageId(null)}><X size={11} /></Button>
                                </div>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color ?? '#6366f1' }} />
                                  <span className="flex-1 text-xs text-[var(--color-text-secondary)]">{stage.name}</span>
                                  <span className="text-[10px] text-[var(--color-text-muted)]">{stage.win_probability}%</span>
                                  <button onClick={() => { setEditingStageId(stage.id); setEditingStageName(stage.name); setEditingStageProb(stage.win_probability); setEditingStageColor(stage.color ?? '#6366f1') }}
                                    className="opacity-0 group-hover/stage:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-opacity"><Pencil size={9} /></button>
                                  <button onClick={() => { if (confirm('Delete this stage?')) deleteStage.mutate({ pipelineId: p.id, stageId: stage.id }) }}
                                    className="opacity-0 group-hover/stage:opacity-100 text-[var(--color-text-muted)] hover:text-red-400 transition-opacity"><Trash2 size={9} /></button>
                                </>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {addingStageFor === p.id ? (
                        <div className="flex items-center gap-1 ml-5">
                          <Input
                            autoFocus
                            value={newStageName}
                            onChange={e => setNewStageName(e.target.value)}
                            placeholder="Stage name"
                            onKeyDown={e => { if (e.key === 'Enter' && newStageName.trim()) createStage.mutate({ pipelineId: p.id, name: newStageName.trim() }); if (e.key === 'Escape') { setAddingStageFor(null); setNewStageName('') } }}
                            containerClassName="!mb-0 flex-1"
                            className="!text-xs"
                          />
                          <Button variant="ghost" size="sm" iconOnly onClick={() => newStageName.trim() && createStage.mutate({ pipelineId: p.id, name: newStageName.trim() })}><Check size={11} /></Button>
                          <Button variant="ghost" size="sm" iconOnly onClick={() => { setAddingStageFor(null); setNewStageName('') }}><X size={11} /></Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setAddingStageFor(p.id)} className="!text-[10px] ml-5">
                          <Plus size={9} /> Add stage
                        </Button>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          ))}

          {addingPipeline ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={newPipelineName}
                onChange={e => setNewPipelineName(e.target.value)}
                placeholder="Pipeline name"
                onKeyDown={e => { if (e.key === 'Enter' && newPipelineName.trim()) createPipeline.mutate(newPipelineName.trim()); if (e.key === 'Escape') { setAddingPipeline(false); setNewPipelineName('') } }}
                containerClassName="!mb-0 flex-1"
                className="!text-xs"
              />
              <Button variant="ghost" size="sm" iconOnly onClick={() => newPipelineName.trim() && createPipeline.mutate(newPipelineName.trim())}><Check size={11} /></Button>
              <Button variant="ghost" size="sm" iconOnly onClick={() => { setAddingPipeline(false); setNewPipelineName('') }}><X size={11} /></Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAddingPipeline(true)} className="!text-xs">
              <Plus size={12} /> Add pipeline
            </Button>
          )}
        </div>
      </Modal>
    </div>
  )
}

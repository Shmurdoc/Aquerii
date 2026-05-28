import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  Search, Plus, Loader2, Target, Mail, Building2, UserCheck, TrendingUp, XCircle,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import {
  useLeads, useCreateLead, useUpdateLead, useDeleteLead,
  useAssignLead, useConvertLead, CrmLead, Pipeline,
} from '@/lib/crm'
import { Button, Input, DataTable, type Column } from '@/components/ui'

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

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

export default function LeadsPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const [search, setSearch] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newForm, setNewForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '', source: 'manual' })
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null)

  const { data: leadsData, isLoading, refetch } = useLeads(wid)
  const leads = leadsData?.data ?? []
  const createLead = useCreateLead(wid)

  const { data: pipelinesData } = useQuery<{ data: Pipeline[] }>({
    queryKey: ['crm-pipelines', wid],
    queryFn: () => api.get(`/workspaces/${wid}/crm/pipelines`).then(r => r.data),
    enabled: !!wid,
  })
  const pipelines = pipelinesData?.data ?? []

  const filtered = leads.filter(l =>
    !search || `${l.first_name} ${l.last_name} ${l.email ?? ''} ${l.company_name ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const columns: Column<CrmLead>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: l => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-purple-600/20 text-purple-300 flex items-center justify-center text-xs font-semibold shrink-0">
            {l.first_name?.[0] ?? '?'}
          </div>
          <span className="font-medium text-[var(--color-text-primary)]">{l.first_name} {l.last_name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      hideOnMobile: true,
      render: l => l.email ? (
        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]"><Mail size={12} className="text-[var(--color-text-muted)]" />{l.email}</span>
      ) : <span className="text-[var(--color-text-muted)]">&mdash;</span>,
    },
    {
      key: 'company_name',
      header: 'Company',
      sortable: true,
      hideOnMobile: true,
      render: l => l.company_name ? (
        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]"><Building2 size={12} className="text-[var(--color-text-muted)]" />{l.company_name}</span>
      ) : <span className="text-[var(--color-text-muted)]">&mdash;</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: l => (
        <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', statusColor(l.status))}>{l.status}</span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      sortable: true,
      render: l => <span className="text-xs text-[var(--color-text-secondary)]">{l.score}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: l => (
        <div className="text-right">
          <Button variant="ghost" size="sm" onClick={() => setSelectedLead(l)}>Manage</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[var(--color-glass-border)] flex items-center gap-3 shrink-0">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)] flex-1">Leads</h1>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            containerClassName="!mb-0"
            className="!pl-8 !w-56"
          />
        </div>
        <Button size="sm" onClick={() => setShowNewForm(true)}>
          <Plus size={13} /> New Lead
        </Button>
      </div>

      {showNewForm && (
        <div className="px-6 py-3 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] flex items-end gap-3 flex-wrap">
          {(['first_name', 'last_name', 'email', 'phone', 'company_name'] as const).map(f => (
            <div key={f}>
              <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5 capitalize">{f.replace('_', ' ')}</label>
              <Input
                autoFocus={f === 'first_name'}
                value={newForm[f]}
                onChange={e => setNewForm(v => ({ ...v, [f]: e.target.value }))}
                containerClassName="!mb-0"
                className="!w-36"
              />
            </div>
          ))}
          <div className="flex gap-2 pb-0.5">
            <Button
              size="sm"
              onClick={() => {
                if (!newForm.first_name.trim() || !newForm.last_name.trim()) { toast.error('First and last name required.'); return }
                createLead.mutate(newForm, {
                  onSuccess: () => { setShowNewForm(false); setNewForm({ first_name: '', last_name: '', email: '', phone: '', company_name: '', source: 'manual' }) },
                  onError: () => toast.error('Failed to create lead.'),
                })
              }}
              disabled={createLead.isPending}
              loading={createLead.isPending}
            >
              <Plus size={12} /> Create
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={l => l.id}
          isLoading={isLoading}
          emptyTitle={search ? 'No leads match your search.' : 'No leads yet.'}
          emptyDescription={search ? undefined : 'Add your first one to get started.'}
          onRetry={refetch}
        />
      </div>

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
      <div className="bg-[var(--color-bg-deepest)] border border-[var(--color-glass-border)] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-glass-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{lead.first_name} {lead.last_name}</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><XCircle size={16} /></button>
        </div>

        <div className="flex gap-1 px-5 pt-3 border-b border-[var(--color-glass-border)]">
          {(['details', 'assign', 'convert'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors capitalize', tab === t ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]')}>
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
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block capitalize">{f.replace('_', ' ')}</label>
                  {f === 'notes' ? (
                    <textarea value={editForm[f]} onChange={e => setEditForm(v => ({ ...v, [f]: e.target.value }))} rows={2}
                      className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none" />
                  ) : f === 'status' ? (
                    <select value={editForm[f]} onChange={e => setEditForm(v => ({ ...v, [f]: e.target.value }))}
                      className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
                      {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <Input value={editForm[f]} onChange={e => setEditForm(v => ({ ...v, [f]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => updateLead.mutate(editForm, { onError: () => toast.error('Update failed.') })}
                  disabled={updateLead.isPending} loading={updateLead.isPending}>Save</Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this lead?')) deleteLead.mutate(undefined, { onSuccess: onClose }) }}>Delete</Button>
              </div>
            </>
          )}

          {tab === 'assign' && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)]">Assign to a team member</p>
              <Input value={assignUserId} onChange={e => setAssignUserId(e.target.value)} placeholder="User ID…" />
              <Button fullWidth size="sm" onClick={() => assignLead.mutate({ assigned_to: assignUserId }, {
                onSuccess: () => toast.success('Assigned!'),
                onError: () => toast.error('Assignment failed.'),
              })} disabled={!assignUserId || assignLead.isPending} loading={assignLead.isPending}>Assign</Button>
            </div>
          )}

          {tab === 'convert' && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)]">Convert this lead to a contact and deal</p>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Deal Title</label>
                <Input value={convertData.deal_title} onChange={e => setConvertData(v => ({ ...v, deal_title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Deal Value</label>
                <Input type="number" value={convertData.deal_value} onChange={e => setConvertData(v => ({ ...v, deal_value: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Pipeline</label>
                <select value={convertData.pipeline_id} onChange={e => setConvertData(v => ({ ...v, pipeline_id: e.target.value, stage_id: '' }))}
                  className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {selectedPipeline && (
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Stage</label>
                  <select value={convertData.stage_id} onChange={e => setConvertData(v => ({ ...v, stage_id: e.target.value }))}
                    className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
                    <option value="">Select stage…</option>
                    {selectedPipeline.stages.sort((a, b) => a.position - b.position).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <Button variant="success" fullWidth size="sm" onClick={handleConvert} disabled={convertLeadMutation.isPending} loading={convertLeadMutation.isPending}>
                <TrendingUp size={12} /> Convert to Deal
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { X, Phone, Mail, FileText, MessageSquare, Calendar, ExternalLink, Trash2, Plus, Clock, Search, DollarSign, User, Save, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Modal, Input, Select, MentionInput, Button } from '@/components/ui'
import type { Pipeline } from '@/lib/crm'

const ACTIVITY_TYPES = ['call', 'email', 'note', 'meeting'] as const

interface Deal {
  id: string
  title: string
  value: number | null
  currency?: string
  stage?: { name: string; id?: string }
  stage_id: string
  pipeline_id: string
  contact_id?: string
  contact?: { id: string; full_name: string } | null
  description?: string | null
  notes?: string | null
  score?: number
  created_at: string
  updated_at: string
}

interface Props {
  deal: Deal
  workspaceId: string
  onClose: () => void
}

export default function DealDetailModal({ deal, workspaceId, onClose }: Props) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(deal.title)
  const [value, setValue] = useState(deal.value?.toString() ?? '')
  const [stageId, setStageId] = useState(deal.stage_id)
  const [notes, setNotes] = useState(deal.description ?? deal.notes ?? '')
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([])
  const [activityType, setActivityType] = useState<string>('note')
  const [activityBody, setActivityBody] = useState('')
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10))

  // Linked item
  const [itemSearch, setItemSearch] = useState('')

  // Load pipelines for stage selector
  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['crm-pipelines', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/crm/pipelines`)
      return res.data.data
    },
    enabled: !!workspaceId,
  })

  const pipeline = pipelines.find(p => p.id === deal.pipeline_id)
  const stages = [...(pipeline?.stages ?? [])].sort((a, b) => a.position - b.position)

  const linkItem = useMutation({
    mutationFn: (itemId: string) =>
      api.post(`/workspaces/${workspaceId}/crm/deals/${deal.id}/link-item`, { item_id: itemId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal', deal.id, workspaceId] }),
    onError: () => toast.error('Failed to link item.'),
  })

  const unlinkItem = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${workspaceId}/crm/deals/${deal.id}/unlink-item`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal', deal.id, workspaceId] }),
    onError: () => toast.error('Failed to unlink item.'),
  })

  // Load deal with linked item
  const { data: dealData } = useQuery({
    queryKey: ['deal', deal.id, workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/crm/deals/${deal.id}`)
      return res.data.data
    },
    enabled: !!workspaceId,
  })

  const linkedItem = dealData?.linked_item
  const linkedItemId = dealData?.linked_item_id

  const { data: items = [] } = useQuery({
    queryKey: ['search-items', workspaceId, itemSearch],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/items`, {
        params: itemSearch ? { search: itemSearch } : {},
      })
      return res.data.data ?? []
    },
    enabled: !!workspaceId && !linkedItem,
  })

  // Activities
  const { data: activities = [] } = useQuery({
    queryKey: ['deal-activities', deal.id, workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/crm/deals/${deal.id}/activities`)
      return res.data.data
    },
    enabled: !!workspaceId,
  })

  const createActivity = useMutation({
    mutationFn: (body: { type: string; body: string; date?: string }) =>
      api.post(`/workspaces/${workspaceId}/crm/deals/${deal.id}/activities`, {
        type: body.type,
        description: body.body,
        activity_date: body.date,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-activities', deal.id, workspaceId] })
      setActivityBody('')
    },
    onError: () => toast.error('Failed to create activity.'),
  })

  const deleteActivity = useMutation({
    mutationFn: (activityId: string) =>
      api.delete(`/workspaces/${workspaceId}/crm/deals/${deal.id}/activities/${activityId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-activities', deal.id, workspaceId] }),
  })

  // PATCH deal
  const updateDeal = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/workspaces/${workspaceId}/crm/deals/${deal.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal', deal.id, workspaceId] })
      qc.invalidateQueries({ queryKey: ['crm-deals'] })
      setEditing(false)
      toast.success('Deal updated.')
    },
    onError: () => toast.error('Failed to update deal.'),
  })

  // DELETE deal
  const deleteDeal = useMutation({
    mutationFn: () =>
      api.delete(`/workspaces/${workspaceId}/crm/deals/${deal.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] })
      toast.success('Deal deleted.')
      onClose()
    },
    onError: () => toast.error('Failed to delete deal.'),
  })

  const handleSave = () => {
    const payload: Record<string, unknown> = {}
    if (title !== deal.title) payload.title = title
    const numValue = value ? Number(value) : null
    if (numValue !== deal.value) payload.value = numValue
    if (stageId !== deal.stage_id) payload.stage_id = stageId
    const currentNotes = deal.description ?? deal.notes ?? ''
    if (notes !== currentNotes) {
      payload.description = notes
      payload.notes = notes
    }
    if (mentionUserIds.length > 0) payload.mention_user_ids = mentionUserIds
    if (Object.keys(payload).length === 0) {
      setEditing(false)
      return
    }
    updateDeal.mutate(payload)
  }

  const typeIcon = (t: string) => {
    switch (t) {
      case 'call': return <Phone size={12} />
      case 'email': return <Mail size={12} />
      case 'meeting': return <Calendar size={12} />
      default: return <MessageSquare size={12} />
    }
  }

  const typeColor = (t: string) => {
    switch (t) {
      case 'call': return 'border-l-green-500'
      case 'email': return 'border-l-blue-500'
      case 'meeting': return 'border-l-purple-500'
      default: return 'border-l-gray-500'
    }
  }

  const currentStage = stages.find(s => s.id === stageId)

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={editing ? 'Edit Deal' : dealData?.title ?? deal.title}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="danger"
            size="sm"
            onClick={() => { if (confirm('Delete this deal permanently?')) deleteDeal.mutate() }}
            disabled={deleteDeal.isPending}
            loading={deleteDeal.isPending}
          >
            <Trash2 size={12} /> Delete
          </Button>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending} loading={updateDeal.isPending}>
                  <Save size={12} /> Save
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setEditing(true)}>
                <Pencil size={12} /> Edit
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Editable fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={!editing}
            size="sm"
          />
          <Input
            label="Value"
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={!editing}
            size="sm"
            icon={<DollarSign />}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Stage</label>
            {editing ? (
              <select
                value={stageId}
                onChange={e => setStageId(e.target.value)}
                className="w-full rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-primary)] border border-[var(--color-glass-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentStage?.color ?? '#6366f1' }} />
                <span>{currentStage?.name ?? 'Unknown'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Assigned Contact</label>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <User size={14} className="text-[var(--color-text-muted)]" />
              <span>{deal.contact?.full_name ?? dealData?.contact?.full_name ?? 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {/* Notes / Description */}
        <MentionInput
          value={notes}
          onChange={(val, ids) => { setNotes(val); setMentionUserIds(ids) }}
          placeholder="Add notes about this deal…"
          rows={3}
          className={editing ? '' : 'pointer-events-none opacity-70'}
        />

        {/* Linked Item */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-2">
            <ExternalLink size={10} /> Linked Item
          </label>
          {linkedItem ? (
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
              <FileText size={14} className="text-indigo-400" />
              <span className="text-sm text-gray-200 flex-1 truncate">{linkedItem.title}</span>
              <button
                onClick={() => unlinkItem.mutate()}
                className="text-gray-600 hover:text-red-400 text-xs"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  placeholder="Search items…"
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {items.length > 0 && (
                <ul className="bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700 max-h-36 overflow-y-auto">
                  {items.slice(0, 10).map((item: any) => (
                    <li key={item.id}>
                      <button
                        onClick={() => { linkItem.mutate(item.id); setItemSearch('') }}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors truncate"
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-3">
            <Clock size={10} /> Activity Timeline
          </label>

          <div className="space-y-0">
            {activities.length === 0 ? (
              <p className="text-xs text-gray-600 mb-3">No activities recorded.</p>
            ) : (
              activities.map((a: any) => (
                <div
                  key={a.id}
                  className={`border-l-2 ${typeColor(a.type)} pl-3 pb-4 group`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">{typeIcon(a.type)}</span>
                    <span className="text-xs font-medium text-gray-300 capitalize">{a.type}</span>
                    <span className="text-[10px] text-gray-600">
                      {a.activity_date ? format(new Date(a.activity_date), 'MMM d') : ''}
                    </span>
                    {a.user && (
                      <span className="text-[10px] text-gray-600 ml-auto">{a.user.name}</span>
                    )}
                    <button
                      onClick={() => deleteActivity.mutate(a.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-300 mt-0.5 whitespace-pre-wrap">{a.body}</p>
                </div>
              ))
            )}
          </div>

          {/* Add activity form */}
          <div className="bg-gray-800/50 rounded-xl p-3 mt-2 space-y-2">
            <div className="flex gap-1.5">
              {ACTIVITY_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setActivityType(t)}
                  className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                    activityType === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {typeIcon(t)}
                  <span className="ml-1">{t}</span>
                </button>
              ))}
            </div>
            <textarea
              value={activityBody}
              onChange={e => setActivityBody(e.target.value)}
              placeholder="Details…"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={activityDate}
                onChange={e => setActivityDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={() => activityBody.trim() && createActivity.mutate({
                  type: activityType,
                  body: activityBody.trim(),
                  date: activityDate || undefined,
                })}
                disabled={!activityBody.trim()}
                className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
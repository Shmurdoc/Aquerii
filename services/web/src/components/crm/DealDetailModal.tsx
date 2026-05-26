import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { X, Phone, Mail, FileText, MessageSquare, Calendar, ExternalLink, Trash2, Plus, Clock, Search } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ACTIVITY_TYPES = ['call', 'email', 'note', 'meeting'] as const

interface Deal {
  id: string
  title: string
  value: number | null
  currency?: string
  stage?: { name: string }
  stage_id: string
  pipeline_id: string
  contact_id?: string
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
  const [activityType, setActivityType] = useState<string>('note')
  const [activityBody, setActivityBody] = useState('')
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10))

  // Linked item
  const [itemSearch, setItemSearch] = useState('')

  const linkItem = useMutation({
    mutationFn: (itemId: string) =>
      api.post(`/workspaces/${workspaceId}/crm/deals/${deal.id}/link-item`, { item_id: itemId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal', deal.id, workspaceId] }),
    onError: () => toast.error('Failed to link item.'),
  })

  const unlinkItem = useMutation({
    mutationFn: () =>
      api.delete(`/workspaces/${workspaceId}/crm/deals/${deal.id}/link-item`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal', deal.id, workspaceId] }),
    onError: () => toast.error('Failed to unlink item.'),
  })

  // Load deal with linked item (must be before items query so linkedItem is available)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">{dealData?.title ?? deal.title}</h2>
            <p className="text-sm text-gray-400">
              {dealData?.stage?.name ?? deal.stage?.name} &middot; ${(dealData?.value ?? deal.value)?.toLocaleString()} {dealData?.currency ?? deal.currency}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
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
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCampaigns, useCreateCampaign, useDeleteCampaign, useLaunchCampaign, useCampaignStats, Campaign } from '@/lib/marketing'
import { Plus, Loader2, Trash2, Play, BarChart3, X, Target, ArrowUpRight } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-gray-500 bg-gray-800',
  active: 'text-green-400 bg-green-900/30',
  paused: 'text-yellow-400 bg-yellow-900/30',
  completed: 'text-blue-400 bg-blue-900/30',
  cancelled: 'text-red-400 bg-red-900/30',
}

export default function CampaignsPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', type: 'email', goal: '' })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [launchContactIds, setLaunchContactIds] = useState('')

  const params: Record<string, string> = {}
  if (statusFilter) params.status = statusFilter

  const { data, isLoading } = useCampaigns(wid, Object.keys(params).length ? params : undefined)
  const campaigns = data?.data ?? []
  const createCampaign = useCreateCampaign(wid)
  const deleteCampaign = useDeleteCampaign(wid)

  if (!workspace) return null

  const handleCreate = () => {
    if (!form.name.trim()) return
    createCampaign.mutate(form as any, { onSuccess: () => { setShowForm(false); setForm({ name: '', description: '', type: 'email', goal: '' }) } })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white flex-1">Campaigns</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={12} /> New campaign
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <input placeholder="Campaign name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600 resize-none" />
          <div className="flex items-center gap-3">
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="social">Social</option>
              <option value="ads">Ads</option>
            </select>
            <input placeholder="Goal" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none placeholder-gray-600" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button onClick={handleCreate} disabled={!form.name.trim()} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">Create</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-600">
          <Target size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No campaigns yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <CampaignCard
              key={c.id}
              campaign={c}
              expanded={expanded === c.id}
              onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
              onDelete={() => deleteCampaign.mutate(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CampaignCard({ campaign: c, expanded, onToggle, onDelete }: {
  campaign: Campaign; expanded: boolean; onToggle: () => void; onDelete: () => void
}) {
  const workspace = useAuthStore(s => s.workspace)
  const launch = useLaunchCampaign(workspace?.id, c.id)
  const { data: statsData } = useCampaignStats(workspace?.id, expanded ? c.id : null)
  const [contactIds, setContactIds] = useState('')

  const handleLaunch = () => {
    const ids = contactIds.split(',').map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) return
    launch.mutate(ids, { onSuccess: () => setContactIds('') })
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={onToggle}>
        <div className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-green-500' : c.status === 'completed' ? 'bg-blue-500' : 'bg-gray-600'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">{c.name}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[c.status]}`}>{c.status}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-0.5">
            <span>{c.type}</span>
            <span>Sent: {c.sent_count}</span>
            <span>Opened: {c.opened_count}</span>
            <span>Converted: {c.converted_count}</span>
            {c.budget && <span>Budget: ${c.budget}</span>}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-3">
          {c.description && <p className="text-xs text-gray-500">{c.description}</p>}
          {c.goal && <p className="text-xs text-gray-500">Goal: {c.goal}</p>}

          {statsData?.data && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Sent', value: statsData.data.sent },
                { label: 'Opened', value: statsData.data.opened },
                { label: 'Clicked', value: statsData.data.clicked },
                { label: 'Converted', value: statsData.data.converted },
              ].map(s => (
                <div key={s.label} className="bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                </div>
              ))}
              {statsData.data.roi !== null && (
                <div className="bg-gray-800/50 rounded-lg p-2 text-center col-span-4">
                  <p className="text-xs text-gray-500">ROI</p>
                  <p className="text-sm font-bold text-green-400">{statsData.data.roi}%</p>
                </div>
              )}
            </div>
          )}

          {c.status === 'draft' && (
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-xs text-gray-500 font-medium">Launch Campaign</p>
              <div className="flex gap-2">
                <input value={contactIds} onChange={e => setContactIds(e.target.value)} placeholder="Comma-separated contact IDs" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
                <button onClick={handleLaunch} disabled={!contactIds.trim() || launch.isPending}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                  <Play size={11} /> Launch
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

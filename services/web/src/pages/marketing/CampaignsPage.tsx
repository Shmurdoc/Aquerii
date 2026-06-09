import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCampaigns, useCreateCampaign, useDeleteCampaign, useLaunchCampaign, useCampaignStats, Campaign } from '@/lib/marketing'
import { Plus, Trash2, Play, Target } from 'lucide-react'
import { Button, Input, Select, Badge } from '@/components/ui'

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-gray-400 bg-gray-500/10',
  active: 'text-green-400 bg-green-500/10',
  paused: 'text-yellow-400 bg-yellow-500/10',
  completed: 'text-blue-400 bg-blue-500/10',
  cancelled: 'text-red-400 bg-red-500/10',
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
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)] flex-1">Campaigns</h1>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="sm" containerClassName="!mb-0 !w-32">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </Select>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={12} /> New campaign
        </Button>
      </div>

      {showForm && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
          <Input placeholder="Campaign name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} containerClassName="!mb-0" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] placeholder-[var(--color-text-muted)] resize-none" />
          <div className="flex items-center gap-3">
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} size="sm">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="social">Social</option>
              <option value="ads">Ads</option>
            </Select>
            <Input placeholder="Goal" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} containerClassName="!mb-0 flex-1" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!form.name.trim()} loading={createCampaign.isPending}>Create</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><span className="text-[var(--color-text-muted)] text-sm">Loading…</span></div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
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
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors" onClick={onToggle}>
        <div className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-[var(--color-status-done)]' : c.status === 'completed' ? 'bg-blue-500' : 'bg-[var(--color-text-muted)]'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{c.name}</p>
            <Badge variant={c.status === 'active' ? 'success' : c.status === 'completed' ? 'info' : 'default'}>{c.status}</Badge>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)] mt-0.5">
            <span>{c.type}</span>
            <span>Sent: {c.sent_count}</span>
            <span>Opened: {c.opened_count}</span>
            <span>Converted: {c.converted_count}</span>
            {c.budget && <span>Budget: ${c.budget}</span>}
          </div>
        </div>
        <Button variant="ghost" size="sm" iconOnly onClick={e => { e.stopPropagation(); onDelete() }} title="Delete">
          <Trash2 size={13} />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-glass-border)] px-4 py-3 space-y-3">
          {c.description && <p className="text-xs text-[var(--color-text-secondary)]">{c.description}</p>}
          {c.goal && <p className="text-xs text-[var(--color-text-secondary)]">Goal: {c.goal}</p>}

          {statsData?.data && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Sent', value: statsData.data.sent },
                { label: 'Opened', value: statsData.data.opened },
                { label: 'Clicked', value: statsData.data.clicked },
                { label: 'Converted', value: statsData.data.converted },
              ].map(s => (
                <div key={s.label} className="bg-[var(--color-bg-elevated)] rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">{s.value}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{s.label}</p>
                </div>
              ))}
              {statsData.data.roi !== null && (
                <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2 text-center col-span-4">
                  <p className="text-xs text-[var(--color-text-muted)]">ROI</p>
                  <p className="text-sm font-bold text-[var(--color-status-done)]">{statsData.data.roi}%</p>
                </div>
              )}
            </div>
          )}

          {c.status === 'draft' && (
            <div className="border-t border-[var(--color-glass-border)] pt-3 space-y-2">
              <p className="text-xs text-[var(--color-text-muted)] font-medium">Launch Campaign</p>
              <div className="flex gap-2">
                <Input value={contactIds} onChange={e => setContactIds(e.target.value)} placeholder="Comma-separated contact IDs" containerClassName="!mb-0 flex-1" />
                <Button size="sm" onClick={handleLaunch} disabled={!contactIds.trim() || launch.isPending} loading={launch.isPending}>
                  <Play size={11} /> Launch
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

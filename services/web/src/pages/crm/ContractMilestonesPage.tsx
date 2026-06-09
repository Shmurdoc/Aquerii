import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Plus, Pencil, Trash2, Check, X, Flag, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { ContractMilestone, useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone, useCompleteMilestone } from '@/lib/contract-milestones'
import { Button, Card, Input, Modal } from '@/components/ui'

const statusColor = (s: string) => {
  switch (s) {
    case 'pending': return 'text-yellow-400 bg-yellow-500/10'
    case 'in_progress': return 'text-blue-400 bg-blue-500/10'
    case 'completed': return 'text-green-400 bg-green-500/10'
    case 'overdue': return 'text-red-400 bg-red-500/10'
    default: return 'text-gray-400 bg-gray-500/10'
  }
}

export default function ContractMilestonesPage() {
  const workspace = useAuthStore(s => s.workspace)
  const qc = useQueryClient()
  const w = workspace?.id
  const [selectedDealId, setSelectedDealId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', amount: '', due_date: '', notes: '' })

  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ['crm-deals', w],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${w}/crm/deals`)
      return res.data?.data?.data ?? res.data?.data ?? []
    },
    enabled: !!w,
  })

  const { data: msData, isLoading } = useMilestones(w, selectedDealId || undefined)
  const milestones: ContractMilestone[] = (msData as any)?.data ?? []

  const createMs = useCreateMilestone(w, selectedDealId)
  const deleteMs = useDeleteMilestone(w)
  const completeMs = useCompleteMilestone(w)

  const updateMs = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/workspaces/${w}/crm/milestones/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', w, 'deals'] }); toast.success('Milestone updated.') },
    onError: () => toast.error('Failed to update milestone.'),
  })

  const handleSubmit = () => {
    if (!form.name.trim() || !selectedDealId) return
    createMs.mutate({
      ...form,
      amount: form.amount ? Number(form.amount) : 0,
      due_date: form.due_date || null,
    }, {
      onSuccess: () => { setShowForm(false); setForm({ name: '', description: '', amount: '', due_date: '', notes: '' }); toast.success('Milestone created.') },
      onError: () => toast.error('Failed to create milestone.'),
    })
  }

  if (!w) return null

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-[var(--color-glass-border)] flex items-center gap-3 shrink-0">
        <Flag size={16} className="text-[var(--color-accent-text)]" />
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Contract Milestones</h1>
        <span className="text-[var(--color-glass-border)] text-sm">|</span>
        <select
          value={selectedDealId}
          onChange={e => setSelectedDealId(e.target.value)}
          className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none min-w-[180px]"
        >
          <option value="">Select a deal...</option>
          {deals.map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        <div className="flex-1" />
        {selectedDealId && (
          <Button size="sm" onClick={() => setShowForm(v => !v)} disabled={!selectedDealId}><Plus size={12} /> Add Milestone</Button>
        )}
      </div>

      {showForm && selectedDealId && (
        <Card variant="default" className="!rounded-none border-x-0">
          <div className="grid grid-cols-2 gap-3 p-4">
            <Input placeholder="Milestone name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} containerClassName="!mb-0 col-span-2" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="col-span-2 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none resize-none" />
            <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} containerClassName="!mb-0" />
            <Input type="date" placeholder="Due date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} containerClassName="!mb-0" />
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="col-span-2 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none resize-none" />
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createMs.isPending || !form.name.trim()} loading={createMs.isPending}>Save</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!selectedDealId ? (
          <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
            <Flag size={32} className="mb-2 opacity-40" />
            <p className="text-sm">Select a deal to view milestones.</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
        ) : milestones.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
            <Flag size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No milestones for this deal.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {milestones.map(ms => (
              <MilestoneRow key={ms.id} ms={ms} w={w} onDelete={(id) => deleteMs.mutate(id, { onSuccess: () => toast.success('Milestone deleted.') })} onComplete={(id) => completeMs.mutate(id, { onSuccess: () => toast.success('Milestone completed.') })} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MilestoneRow({ ms, w, onDelete, onComplete }: { ms: ContractMilestone; w: string; onDelete: (id: string) => void; onComplete: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: ms.name, description: ms.description ?? '', amount: String(ms.amount),
    due_date: ms.due_date ?? '', notes: ms.notes ?? '',
  })
  const qc = useQueryClient()

  const updateMs = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.put(`/workspaces/${w}/crm/milestones/${ms.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', w, 'deals'] }); setEditing(false); toast.success('Milestone updated.') },
    onError: () => toast.error('Failed to update milestone.'),
  })

  if (editing) {
    return (
      <Card variant="default" padding="sm">
        <div className="grid grid-cols-2 gap-2">
          <Input size="sm" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} containerClassName="!mb-0 col-span-2" />
          <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={1} className="col-span-2 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none resize-none" />
          <Input size="sm" type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} containerClassName="!mb-0" />
          <Input size="sm" type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} containerClassName="!mb-0" />
          <div className="col-span-2 flex justify-end gap-1">
            <Button variant="ghost" size="sm" iconOnly onClick={() => updateMs.mutate(editForm)}><Check size={12} /></Button>
            <Button variant="ghost" size="sm" iconOnly onClick={() => setEditing(false)}><X size={12} /></Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="interactive" padding="sm" className="group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{ms.name}</span>
            <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', statusColor(ms.status))}>
              {ms.status.replace('_', ' ')}
            </span>
          </div>
          {ms.description && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{ms.description}</p>}
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
            {ms.amount > 0 && <span>Amount: R{ms.amount.toFixed(2)}</span>}
            {ms.due_date && <span>Due: {ms.due_date}</span>}
            {ms.completed_at && <span>Completed: {new Date(ms.completed_at).toLocaleDateString()}</span>}
          </div>
          {ms.notes && <p className="text-xs text-[var(--color-text-muted)] mt-1 italic">{ms.notes}</p>}
        </div>
        <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {ms.status !== 'completed' && ms.status !== 'overdue' && (
            <Button variant="ghost" size="sm" iconOnly onClick={() => onComplete(ms.id)} title="Mark completed"><Check size={12} /></Button>
          )}
          <Button variant="ghost" size="sm" iconOnly onClick={() => setEditing(true)}><Pencil size={12} /></Button>
          <Button variant="ghost" size="sm" iconOnly onClick={() => { if (confirm('Delete this milestone?')) onDelete(ms.id) }}><Trash2 size={12} /></Button>
        </div>
      </div>
    </Card>
  )
}

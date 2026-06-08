import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Plus, Eye, Pencil, Trash2, Check, X, FileText, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { WorkOrder, useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder, useIssueWorkOrder, useCompleteWorkOrder } from '@/lib/work-orders'
import { Button, Card, Input, Modal } from '@/components/ui'

const statusColor = (s: string) => {
  switch (s) {
    case 'draft': return 'text-gray-400 bg-gray-500/10'
    case 'issued': return 'text-blue-400 bg-blue-500/10'
    case 'in_progress': return 'text-yellow-400 bg-yellow-500/10'
    case 'completed': return 'text-green-400 bg-green-500/10'
    case 'cancelled': return 'text-red-400 bg-red-500/10'
    default: return 'text-gray-400 bg-gray-500/10'
  }
}

export default function WorkOrdersPage() {
  const workspace = useAuthStore(s => s.workspace)
  const qc = useQueryClient()
  const w = workspace?.id
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState({
    crm_deal_id: '', title: '', description: '', scope_of_work: '',
    location: '', scheduled_start: '', scheduled_end: '',
    assigned_worker_id: '', total_hours_estimated: '',
  })

  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ['crm-deals', w],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${w}/crm/deals`)
      return res.data?.data?.data ?? res.data?.data ?? []
    },
    enabled: !!w,
  })

  const { data: woData, isLoading } = useWorkOrders(w, filterStatus ? { status: filterStatus } : undefined)
  const workOrders: WorkOrder[] = (woData as any)?.data ?? []

  const createWo = useCreateWorkOrder(w)
  const deleteWo = useDeleteWorkOrder(w)
  const issueWo = useIssueWorkOrder(w)
  const completeWo = useCompleteWorkOrder(w)

  const updateWo = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/workspaces/${w}/crm/work-orders/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', w, 'work-orders'] }); setEditingId(null); toast.success('Work order updated.') },
    onError: () => toast.error('Failed to update work order.'),
  })

  const handleSubmit = () => {
    if (!form.title.trim()) return
    createWo.mutate({
      ...form,
      total_hours_estimated: form.total_hours_estimated ? Number(form.total_hours_estimated) : null,
      scheduled_start: form.scheduled_start || null,
      scheduled_end: form.scheduled_end || null,
    }, {
      onSuccess: () => { setShowForm(false); setForm({ crm_deal_id: '', title: '', description: '', scope_of_work: '', location: '', scheduled_start: '', scheduled_end: '', assigned_worker_id: '', total_hours_estimated: '' }); toast.success('Work order created.') },
      onError: () => toast.error('Failed to create work order.'),
    })
  }

  if (!w) return null

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-[var(--color-glass-border)] flex items-center gap-3 shrink-0">
        <FileText size={16} className="text-[var(--color-accent-text)]" />
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Work Orders</h1>
        <span className="text-[var(--color-glass-border)] text-sm">|</span>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowForm(v => !v)}><Plus size={12} /> New Work Order</Button>
      </div>

      {showForm && (
        <Card variant="default" className="!rounded-none border-x-0">
          <div className="grid grid-cols-2 gap-3 p-4">
            <select
              value={form.crm_deal_id}
              onChange={e => setForm(f => ({ ...f, crm_deal_id: e.target.value }))}
              className="col-span-2 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
            >
              <option value="">Select deal/contract...</option>
              {deals.map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
            <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} containerClassName="!mb-0 col-span-2" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="col-span-2 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none resize-none" />
            <textarea placeholder="Scope of work" value={form.scope_of_work} onChange={e => setForm(f => ({ ...f, scope_of_work: e.target.value }))} rows={2} className="col-span-2 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none resize-none" />
            <Input placeholder="Location (mine site area)" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} containerClassName="!mb-0" />
            <Input type="date" placeholder="Scheduled start" value={form.scheduled_start} onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} containerClassName="!mb-0" />
            <Input type="date" placeholder="Scheduled end" value={form.scheduled_end} onChange={e => setForm(f => ({ ...f, scheduled_end: e.target.value }))} containerClassName="!mb-0" />
            <Input type="number" placeholder="Est. hours" value={form.total_hours_estimated} onChange={e => setForm(f => ({ ...f, total_hours_estimated: e.target.value }))} containerClassName="!mb-0" />
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createWo.isPending || !form.title.trim()} loading={createWo.isPending}>Save</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
        ) : workOrders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
            <FileText size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No work orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-glass-border)]">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Number</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Title</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Deal</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Location</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Scheduled</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map(wo => (
                  <tr key={wo.id} className="border-b border-[var(--color-glass-border)] hover:bg-[var(--color-bg-hover)] transition-colors group">
                    <td className="px-3 py-2 text-xs text-[var(--color-text-muted)] font-mono">{wo.work_order_number}</td>
                    <td className="px-3 py-2 text-sm text-[var(--color-text-primary)] font-medium">{wo.title}</td>
                    <td className="px-3 py-2">
                      <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', statusColor(wo.status))}>{wo.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">{wo.deal?.title ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">{wo.location ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                      {wo.scheduled_start ? `${wo.scheduled_start}${wo.scheduled_end ? ` → ${wo.scheduled_end}` : ''}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {wo.status === 'draft' && (
                          <Button variant="ghost" size="sm" iconOnly onClick={() => issueWo.mutate(wo.id, { onSuccess: () => toast.success('Work order issued.') })} title="Issue"><Check size={12} /></Button>
                        )}
                        {wo.status === 'issued' && (
                          <Button variant="ghost" size="sm" iconOnly onClick={() => completeWo.mutate({ id: wo.id })} title="Complete"><Check size={12} /></Button>
                        )}
                        <Button variant="ghost" size="sm" iconOnly onClick={() => setDetailId(wo.id)}><Eye size={12} /></Button>
                        {wo.status === 'draft' && (
                          <Button variant="ghost" size="sm" iconOnly onClick={() => setEditingId(wo.id)}><Pencil size={12} /></Button>
                        )}
                        {wo.status === 'draft' && (
                          <Button variant="ghost" size="sm" iconOnly onClick={() => { if (confirm('Delete this work order?')) deleteWo.mutate(wo.id, { onSuccess: () => toast.success('Work order deleted.') }) }}><Trash2 size={12} /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!editingId} onClose={() => setEditingId(null)} title="Edit Work Order" size="md">
        <p className="text-xs text-[var(--color-text-muted)] mb-3">Editing work order</p>
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => { if (editingId) updateWo.mutate({ id: editingId, data: { title: editingId } }) }}>Save</Button>
        </div>
      </Modal>

      <Modal open={!!detailId} onClose={() => setDetailId(null)} title="Work Order Detail" size="lg">
        {detailId && <WorkOrderDetail id={detailId} w={w!} />}
      </Modal>
    </div>
  )
}

function WorkOrderDetail({ id, w }: { id: string; w: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['crm', w, 'work-orders', id],
    queryFn: () => api.get(`/workspaces/${w}/crm/work-orders/${id}`).then(r => r.data?.data),
    enabled: !!w && !!id,
  })

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin" /></div>
  if (!data) return <p className="text-sm text-[var(--color-text-muted)]">Not found.</p>

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">{data.work_order_number}</span>
        <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', statusColor(data.status))}>{data.status}</span>
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{data.title}</h3>
      {data.description && <p className="text-[var(--color-text-secondary)]">{data.description}</p>}
      {data.scope_of_work && (
        <div>
          <span className="text-xs text-[var(--color-text-muted)] font-medium">Scope of Work</span>
          <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">{data.scope_of_work}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-glass-border)]">
        {data.location && <div><span className="text-xs text-[var(--color-text-muted)]">Location</span><p>{data.location}</p></div>}
        {data.scheduled_start && <div><span className="text-xs text-[var(--color-text-muted)]">Scheduled</span><p>{data.scheduled_start} → {data.scheduled_end ?? '—'}</p></div>}
        {data.actual_start && <div><span className="text-xs text-[var(--color-text-muted)]">Actual Start</span><p>{new Date(data.actual_start).toLocaleString()}</p></div>}
        {data.actual_end && <div><span className="text-xs text-[var(--color-text-muted)]">Actual End</span><p>{new Date(data.actual_end).toLocaleString()}</p></div>}
        {data.total_hours_estimated != null && <div><span className="text-xs text-[var(--color-text-muted)]">Est. Hours</span><p>{data.total_hours_estimated}</p></div>}
        {data.total_hours_actual != null && <div><span className="text-xs text-[var(--color-text-muted)]">Actual Hours</span><p>{data.total_hours_actual}</p></div>}
        {data.assigned_worker && <div><span className="text-xs text-[var(--color-text-muted)]">Assigned</span><p>{data.assigned_worker.name}</p></div>}
        {data.deal && <div><span className="text-xs text-[var(--color-text-muted)]">Related Deal</span><p>{data.deal.title}</p></div>}
      </div>
      {data.notes && (
        <div className="pt-2 border-t border-[var(--color-glass-border)]">
          <span className="text-xs text-[var(--color-text-muted)] font-medium">Notes</span>
          <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}
    </div>
  )
}

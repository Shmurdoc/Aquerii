import { useAuthStore } from '@/stores/authStore'
import { erpGoals, Goal } from '@/lib/erp'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

function NewGoalModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', description: '', type: 'metric', target_value: 0, unit: '', due_date: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await erpGoals.create({ ...form, current_value: 0, status: 'active', owner_id: '' } as any)
    qc.invalidateQueries({ queryKey: ['goals'] })
    toast.success('Goal created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Goal</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><span className="text-lg">×</span></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Goal title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <textarea className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Target" value={form.target_value || ''} onChange={e => setForm(f => ({ ...f, target_value: parseFloat(e.target.value) || 0 }))} />
            <input className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          </div>
          <input type="date" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          <Button type="submit">Create Goal</Button>
        </form>
      </Card>
    </div>
  )
}

export default function GoalsPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', w],
    queryFn: () => erpGoals.list(),
    enabled: !!w,
  })

  const deleteGoal = useMutation({
    mutationFn: (id: string) => erpGoals.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Deleted.') },
  })

  const columns: Column<Goal>[] = [
    { key: 'title', header: 'Goal', render: r => <span className="font-medium">{r.title}</span> },
    { key: 'type', header: 'Type', render: r => <Badge variant="info">{r.type}</Badge> },
    { key: 'target_value', header: 'Target', render: r => `${r.current_value ?? 0} / ${r.target_value} ${r.unit ?? ''}` },
    { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'active' ? 'success' : 'default'}>{r.status}</Badge> },
    { key: 'due_date', header: 'Due', render: r => r.due_date ? formatDate(r.due_date) : '—' },
    { key: 'id', header: '', render: r => (
      <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deleteGoal.mutate(r.id) }}>Delete</Button>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Goals & OKRs</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> New Goal</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={goals} loading={isLoading} emptyMessage="No goals set" />
      </Card>
      {showAdd && <NewGoalModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

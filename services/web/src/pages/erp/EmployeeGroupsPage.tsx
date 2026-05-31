import { useAuthStore } from '@/stores/authStore'
import { erpEmployeeGroups, EmployeeGroup } from '@/lib/erp'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

function NewGroupModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', description: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await erpEmployeeGroups.create(form as any)
    qc.invalidateQueries({ queryKey: ['employee-groups'] })
    toast.success('Group created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Employee Group</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><span className="text-lg">×</span></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Group name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <textarea className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Button type="submit">Create Group</Button>
        </form>
      </Card>
    </div>
  )
}

export default function EmployeeGroupsPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['employee-groups', w],
    queryFn: () => erpEmployeeGroups.list(),
    enabled: !!w,
  })

  const deleteGroup = useMutation({
    mutationFn: (id: string) => erpEmployeeGroups.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-groups'] }); toast.success('Deleted.') },
  })

  const columns: Column<EmployeeGroup>[] = [
    { key: 'name', header: 'Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'description', header: 'Description', render: r => r.description ?? '—' },
    { key: 'created_at', header: 'Created', render: r => formatDate(r.created_at) },
    { key: 'id', header: '', render: r => (
      <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deleteGroup.mutate(r.id) }}>Delete</Button>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employee Groups</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> New Group</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={groups} loading={isLoading} emptyMessage="No employee groups" />
      </Card>
      {showAdd && <NewGroupModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

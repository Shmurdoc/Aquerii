/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useAuthStore } from '@/stores/authStore'
import { useCrmApprovalRules, useCreateCrmApprovalRule, useDeleteCrmApprovalRule, CrmApprovalRule } from '@/lib/crm'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useState } from 'react'

function NewRuleModal({ onClose }: { onClose: () => void }) {
  const w = useAuthStore(s => s.workspace?.id)
  const create = useCreateCrmApprovalRule(w)
  const [form, setForm] = useState({ name: '', trigger: '', approvers: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await create.mutateAsync({ ...form, approvers: form.approvers.split(',').map(s => s.trim()), is_active: true } as any)
    toast.success('Approval rule created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Approval Rule</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>Ã—</Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Rule name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Trigger (e.g. deal.value > 10000)" value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))} required />
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Approvers (comma-separated user IDs)" value={form.approvers} onChange={e => setForm(f => ({ ...f, approvers: e.target.value }))} required />
          <Button type="submit" loading={create.isPending}>Create Rule</Button>
        </form>
      </Card>
    </div>
  )
}

export default function ApprovalRulesPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const { data: rules = [], isLoading } = useCrmApprovalRules(w)
  const deleteRule = useDeleteCrmApprovalRule(w, '')
  const [showAdd, setShowAdd] = useState(false)

  const columns: Column<CrmApprovalRule>[] = [
    { key: 'name', header: 'Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'trigger', header: 'Trigger', render: r => <code className="text-xs bg-gray-800 px-1 rounded">{r.trigger}</code> },
    { key: 'approvers', header: 'Approvers', render: r => r.approvers?.length ?? 0 },
    { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'created_at', header: 'Created', render: r => formatDate(r.created_at) },
    { key: 'id', header: '', render: r => (
      <Button variant="ghost" size="sm" onClick={async () => {
        if (confirm('Delete this rule?')) {
          await deleteRule.mutateAsync(r.id)
          toast.success('Rule deleted.')
        }
      }}>Delete</Button>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Approval Rules</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Rule</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={rules} loading={isLoading} emptyMessage="No approval rules" />
      </Card>
      {showAdd && <NewRuleModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useAuthStore } from '@/stores/authStore'
import { useCrmAutomationRules, useCreateCrmAutomationRule, useDeleteCrmAutomationRule, CrmAutomationRule } from '@/lib/crm'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useState } from 'react'

function NewRuleModal({ onClose }: { onClose: () => void }) {
  const w = useAuthStore(s => s.workspace?.id)
  const create = useCreateCrmAutomationRule(w)
  const [form, setForm] = useState({ name: '', trigger_type: '', conditions: '{}', actions: '{}' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await create.mutateAsync({
      ...form,
      conditions: JSON.parse(form.conditions || '{}'),
      actions: JSON.parse(form.actions || '{}'),
      is_active: true,
    } as any)
    toast.success('Automation rule created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Automation Rule</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>Ã—</Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Rule name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Trigger type (e.g. deal.created)" value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))} required />
          <textarea className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono" placeholder='Conditions JSON (e.g. {"status":"won"})' value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} />
          <textarea className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono" placeholder='Actions JSON (e.g. {"type":"notify","channel":"#sales"})' value={form.actions} onChange={e => setForm(f => ({ ...f, actions: e.target.value }))} />
          <Button type="submit" loading={create.isPending}>Create Rule</Button>
        </form>
      </Card>
    </div>
  )
}

export default function AutomationRulesPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const { data: rules = [], isLoading } = useCrmAutomationRules(w)
  const deleteRule = useDeleteCrmAutomationRule(w, '')
  const [showAdd, setShowAdd] = useState(false)

  const columns: Column<CrmAutomationRule>[] = [
    { key: 'name', header: 'Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'trigger_type', header: 'Trigger', render: r => <code className="text-xs bg-gray-800 px-1 rounded">{r.trigger_type}</code> },
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
        <h1 className="text-2xl font-bold">CRM Automation Rules</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Rule</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={rules} loading={isLoading} emptyMessage="No automation rules" />
      </Card>
      {showAdd && <NewRuleModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

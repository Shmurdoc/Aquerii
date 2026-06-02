/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2, Edit2, Copy, X, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Template {
  id: string
  workspace_id: string
  name: string
  type: string
  description: string | null
  content: Record<string, unknown>
  variables: Record<string, string> | null
  version: string
  is_public: boolean
  created_by: string
  created_at: string
}

const typeColors: Record<string, 'default' | 'primary' | 'info' | 'success'> = {
  board: 'primary',
  job_card: 'info',
  invoice: 'success',
  email: 'default',
}

function NewTemplateModal({ onClose }: { onClose: () => void }) {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', type: 'board', description: '', content: '{}', variables: '', is_public: false })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const content = JSON.parse(form.content || '{}')
      const variables = form.variables ? JSON.parse(form.variables) : null
      await api.post(`/workspaces/${w}/templates`, { ...form, content, variables })
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template created.')
      onClose()
    } catch {
      toast.error('Invalid JSON content')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Template</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><span className="text-lg">Ã—</span></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Template name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <select className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="board">Board</option>
            <option value="job_card">Job Card</option>
            <option value="invoice">Invoice</option>
            <option value="email">Email</option>
            <option value="report">Report</option>
          </select>
          <textarea className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <textarea className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono" placeholder='Content JSON (e.g. {"columns":["To Do","In Progress","Done"]})' value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} />
          <textarea className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono" placeholder='Variables JSON (e.g. {"project_name":"My Project"})' value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} rows={2} />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} className="rounded" />
            Make public (available to all workspaces)
          </label>
          <Button type="submit">Create Template</Button>
        </form>
      </Card>
    </div>
  )
}

export default function TemplatesPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', w],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${w}/templates`)
      return (res.data?.data ?? []) as Template[]
    },
    enabled: !!w,
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${w}/templates/${id}`)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Template deleted.') },
  })

  const columns: Column<Template>[] = [
    { key: 'name', header: 'Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'type', header: 'Type', render: r => <Badge variant={typeColors[r.type] ?? 'default'}>{r.type}</Badge> },
    { key: 'version', header: 'Version', render: r => <span className="font-mono text-xs">{r.version}</span> },
    { key: 'is_public', header: 'Visibility', render: r => <Badge variant={r.is_public ? 'success' : 'default'}>{r.is_public ? 'Public' : 'Private'}</Badge> },
    { key: 'created_at', header: 'Created', render: r => formatDate(r.created_at) },
    { key: 'id', header: '', render: r => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deleteTemplate.mutate(r.id) }}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> New Template</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={templates} loading={isLoading} emptyMessage="No templates created yet" />
      </Card>
      {showAdd && <NewTemplateModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useAuthStore } from '@/stores/authStore'
import { erpFieldPermissions, FieldPermission } from '@/lib/erp'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

function NewPermissionModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ module: '', field: '', roles: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await erpFieldPermissions.create({ ...form, roles: form.roles.split(',').map(s => s.trim()) } as any)
    qc.invalidateQueries({ queryKey: ['field-permissions'] })
    toast.success('Permission created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Field Permission</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><span className="text-lg">Ã—</span></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Module (e.g. crm.contacts)" value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))} required />
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Field (e.g. email)" value={form.field} onChange={e => setForm(f => ({ ...f, field: e.target.value }))} required />
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Roles (comma-separated: owner,admin,member)" value={form.roles} onChange={e => setForm(f => ({ ...f, roles: e.target.value }))} required />
          <Button type="submit">Create Permission</Button>
        </form>
      </Card>
    </div>
  )
}

export default function FieldPermissionsPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['field-permissions', w],
    queryFn: () => erpFieldPermissions.list(),
    enabled: !!w,
  })

  const deletePermission = useMutation({
    mutationFn: (id: string) => erpFieldPermissions.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['field-permissions'] }); toast.success('Deleted.') },
  })

  const columns: Column<FieldPermission>[] = [
    { key: 'module', header: 'Module', render: r => <span className="font-medium">{r.module}</span> },
    { key: 'field', header: 'Field', render: r => <code className="text-xs bg-gray-800 px-1 rounded">{r.field}</code> },
    { key: 'roles', header: 'Roles', render: r => r.roles?.map(role => <Badge key={role} variant="info" className="mr-1">{role}</Badge>) },
    { key: 'created_at', header: 'Created', render: r => formatDate(r.created_at) },
    { key: 'id', header: '', render: r => (
      <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deletePermission.mutate(r.id) }}>Delete</Button>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Field Permissions</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Permission</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={permissions} loading={isLoading} emptyMessage="No field permissions configured" />
      </Card>
      {showAdd && <NewPermissionModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

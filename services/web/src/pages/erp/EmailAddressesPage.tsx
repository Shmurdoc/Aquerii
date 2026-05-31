import { useAuthStore } from '@/stores/authStore'
import { erpEmailAddresses, EmailProjectAddress } from '@/lib/erp'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

function NewAddressModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ address: '', label: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await erpEmailAddresses.create({ ...form, is_active: true } as any)
    qc.invalidateQueries({ queryKey: ['email-addresses'] })
    toast.success('Address created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Email Address</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><span className="text-lg">×</span></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Email address" type="email" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Label (e.g. Support, Sales)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
          <Button type="submit">Add Address</Button>
        </form>
      </Card>
    </div>
  )
}

export default function EmailAddressesPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['email-addresses', w],
    queryFn: () => erpEmailAddresses.list(),
    enabled: !!w,
  })

  const deleteAddress = useMutation({
    mutationFn: (id: string) => erpEmailAddresses.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-addresses'] }); toast.success('Deleted.') },
  })

  const columns: Column<EmailProjectAddress>[] = [
    { key: 'address', header: 'Address', render: r => <span className="font-medium">{r.address}</span> },
    { key: 'label', header: 'Label', render: r => r.label ?? '—' },
    { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'created_at', header: 'Created', render: r => formatDate(r.created_at) },
    { key: 'id', header: '', render: r => (
      <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deleteAddress.mutate(r.id) }}>Delete</Button>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Addresses</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Address</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={addresses} loading={isLoading} emptyMessage="No email addresses configured" />
      </Card>
      {showAdd && <NewAddressModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

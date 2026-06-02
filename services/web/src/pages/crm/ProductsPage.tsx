/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck � pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCrmProducts, useCreateCrmProduct, useUpdateCrmProduct, useDeleteCrmProduct, CrmProduct } from '@/lib/crm'
import { Card, Badge, Button, Input, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '@/lib/erp'

function NewProductModal({ onClose }: { onClose: () => void }) {
  const w = useAuthStore(s => s.workspace?.id)
  const create = useCreateCrmProduct(w)
  const [form, setForm] = useState({ name: '', sku: '', description: '', unit_price: 0, unit: 'unit', category: '', is_active: true })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await create.mutateAsync(form)
    toast.success('Product created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Product</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X size={14} /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input placeholder="SKU" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Unit price" value={form.unit_price || ''} onChange={e => setForm(f => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))} />
            <Input placeholder="Unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          </div>
          <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <Button type="submit" loading={create.isPending}>Create Product</Button>
        </form>
      </Card>
    </div>
  )
}

export default function ProductsPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const { data: products = [], isLoading } = useCrmProducts(w)
  const deleteProduct = useDeleteCrmProduct(w, '')
  const [showAdd, setShowAdd] = useState(false)

  const columns: Column<CrmProduct>[] = [
    { key: 'name', header: 'Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'sku', header: 'SKU', render: r => r.sku ?? '—' },
    { key: 'unit_price', header: 'Price', render: r => formatCurrency(r.unit_price) },
    { key: 'unit', header: 'Unit', render: r => r.unit },
    { key: 'category', header: 'Category', render: r => r.category ?? '—' },
    { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'created_at', header: 'Created', render: r => formatDate(r.created_at) },
    { key: 'id', header: '', render: r => (
      <Button variant="ghost" size="sm" onClick={async () => {
        if (confirm('Delete this product?')) {
          await deleteProduct.mutateAsync(r.id)
          toast.success('Product deleted.')
        }
      }}><Trash2 size={12} /></Button>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CRM Products</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Product</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={products} loading={isLoading} emptyMessage="No products yet" />
      </Card>
      {showAdd && <NewProductModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { useSalesOrders, useCreateSalesOrder } from '@/hooks/useSalesOrders'
import { CreateSOPayload, SOStatus, formatCurrency, formatDate } from '@/lib/erp'
import StatusBadge from '@/components/erp/StatusBadge'
import SalesOrderDrawer from '@/components/erp/SalesOrderDrawer'
import LineItemsEditor, { LineItem } from '@/components/erp/LineItemsEditor'

const STATUSES: Array<'' | SOStatus> = ['', 'draft', 'quotation', 'confirmed', 'shipped', 'delivered', 'cancelled']
const today = new Date().toISOString().slice(0, 10)

function NewSOModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    customer_name:    '',
    customer_email:   '',
    currency:         'USD',
    order_date:       today,
    expected_date:    '',
    shipping_address: '',
    notes:            '',
  })
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 },
  ])
  const create = useCreateSalesOrder()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name.trim()) return
    const payload: CreateSOPayload = {
      customer_name:    form.customer_name,
      customer_email:   form.customer_email || undefined,
      currency:         form.currency,
      order_date:       form.order_date,
      expected_date:    form.expected_date || undefined,
      shipping_address: form.shipping_address || undefined,
      notes:            form.notes || undefined,
      items: items.map(({ description, quantity, unit_price, tax_rate }) => ({
        description, quantity, unit_price, tax_rate,
      })),
    }
    await create.mutateAsync(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">New Sales Order</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Customer Name *</label>
              <input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Customer Email</label>
              <input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Currency</label>
              <input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 uppercase" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Order Date</label>
              <input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Expected Date</label>
              <input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs text-gray-500">Shipping Address</label>
              <textarea value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                rows={2} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Line Items</label>
            <LineItemsEditor items={items} onChange={setItems} quantityType="float" currency={form.currency} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
          <button type="submit" disabled={create.isPending}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create SO'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function SalesPage() {
  const [statusFilter, setStatusFilter] = useState<'' | SOStatus>('')
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [showNew, setShowNew]           = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const { data: orders = [], isLoading } = useSalesOrders({
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  })

  const selected = orders.find((o) => o.id === selectedId) ?? null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <h1 className="text-base font-semibold text-gray-100 mr-2">Sales Orders</h1>
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders…"
            className="bg-gray-800 border border-gray-700 rounded pl-8 pr-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-48" />
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={13} />New SO
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-gray-500 text-sm">No sales orders found</p>
            <button onClick={() => setShowNew(true)} className="text-xs text-indigo-400 hover:text-indigo-300">Create your first SO</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Order Date</th>
                <th className="px-4 py-3 font-medium">Expected</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((so) => (
                <tr key={so.id} onClick={() => setSelectedId(so.id)}
                  className={`border-b border-gray-800/60 hover:bg-gray-800/40 cursor-pointer transition-colors ${selectedId === so.id ? 'bg-gray-800/60' : ''}`}>
                  <td className="px-6 py-3 text-indigo-300 font-mono text-xs">{so.order_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{so.customer_name}</p>
                    {so.customer_email && <p className="text-gray-500 text-xs">{so.customer_email}</p>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={so.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(so.order_date)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(so.expected_date)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-200">{formatCurrency(so.total, so.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <SalesOrderDrawer
          so={selected}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      )}
      {showNew && <NewSOModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

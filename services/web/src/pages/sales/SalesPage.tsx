import { useState, useEffect } from 'react'
import { Search, Plus } from 'lucide-react'
import { useSalesOrders, useCreateSalesOrder } from '@/hooks/useSalesOrders'
import { CreateSOPayload, SOStatus, formatCurrency, formatDate } from '@/lib/erp'
import StatusBadge from '@/components/erp/StatusBadge'
import SalesOrderDrawer from '@/components/erp/SalesOrderDrawer'
import LineItemsEditor, { LineItem } from '@/components/erp/LineItemsEditor'
import { Button, Input, DataTable, type Column } from '@/components/ui'

const STATUSES: Array<'' | SOStatus> = ['', 'draft', 'quotation', 'confirmed', 'shipped', 'delivered', 'cancelled']
const today = new Date().toISOString().slice(0, 10)

function NewSOModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    customer_name:    '',
    customer_email:   '',
    currency:         'ZAR',
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
        className="bg-[var(--color-bg-deepest)] border border-[var(--color-glass-border)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-glass-border)]">
          <h2 className="font-semibold text-[var(--color-text-primary)]">New Sales Order</h2>
          <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" aria-label="Close"><Plus size={18} className="rotate-45" /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Customer Name *</label>
              <input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Customer Email</label>
              <input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Currency</label>
              <input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] uppercase" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Order Date</label>
              <input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Expected Date</label>
              <input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Shipping Address</label>
              <textarea value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                rows={2} className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Line Items</label>
            <LineItemsEditor items={items} onChange={setItems} quantityType="float" currency={form.currency} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:border-[var(--color-accent)]" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--color-glass-border)] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={create.isPending} disabled={create.isPending}>Create SO</Button>
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

  const selected = orders.find((o: any) => o.id === selectedId) ?? null

  const columns: Column<any>[] = [
    {
      key: 'order_number',
      header: 'Order #',
      sortable: true,
      render: (so: any) => <span className="text-[var(--color-accent-text)] font-mono text-xs">{so.order_number}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      sortable: true,
      render: (so: any) => (
        <div>
          <p className="text-[var(--color-text-primary)]">{so.customer_name}</p>
          {so.customer_email && <p className="text-[10px] text-[var(--color-text-muted)]">{so.customer_email}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (so: any) => <StatusBadge status={so.status} />,
    },
    {
      key: 'order_date',
      header: 'Order Date',
      hideOnMobile: true,
      render: (so: any) => <span className="text-xs text-[var(--color-text-muted)]">{formatDate(so.order_date)}</span>,
    },
    {
      key: 'expected_date',
      header: 'Expected',
      hideOnMobile: true,
      render: (so: any) => <span className="text-xs text-[var(--color-text-muted)]">{formatDate(so.expected_date)}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      className: 'text-right',
      render: (so: any) => <span className="font-mono text-[var(--color-text-primary)]">{formatCurrency(so.total, so.currency)}</span>,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)]">Total Orders</p>
          <p className="text-xl font-bold text-[var(--color-text-primary)]">{orders.length}</p>
        </div>
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)]">Total Value</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(orders.reduce((s: number, o: any) => s + (o.total || 0), 0))}</p>
        </div>
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)]">Quotations</p>
          <p className="text-xl font-bold text-blue-400">{orders.filter((o: any) => o.status === 'quotation').length}</p>
        </div>
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)]">Delivered</p>
          <p className="text-xl font-bold text-emerald-400">{orders.filter((o: any) => o.status === 'delivered').length}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] shrink-0">
        <h1 className="text-base font-semibold text-[var(--color-text-primary)] mr-2">Sales Orders</h1>
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded transition-colors ${statusFilter === s ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'}`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders…"
            containerClassName="!mb-0"
            className="!pl-8 !w-48" />
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus size={13} /> New SO
        </Button>
      </div>

      <div className="flex-1 overflow-auto animate-fade-in">
        <DataTable
          columns={columns}
          data={orders}
          keyExtractor={(o: any) => o.id}
          isLoading={isLoading}
          emptyTitle="No sales orders found"
          emptyDescription="Create your first sales order to get started."
        />
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

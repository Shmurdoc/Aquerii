import { useState, useEffect } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { useInvoices, useCreateInvoice } from '@/hooks/useInvoices'
import { CreateInvoicePayload, formatCurrency, formatDate } from '@/lib/erp'
import StatusBadge from '@/components/erp/StatusBadge'
import InvoiceDrawer from '@/components/erp/InvoiceDrawer'
import LineItemsEditor, { LineItem } from '@/components/erp/LineItemsEditor'

const STATUSES = ['', 'draft', 'sent', 'paid', 'overdue', 'cancelled']

// ─── New Invoice Form (inline modal) ─────────────────────────────────────────

interface NewFormState {
  invoice_number: string
  customer_name: string
  customer_email: string
  billing_address: string
  issue_date: string
  due_date: string
  currency: string
  notes: string
  items: LineItem[]
}

const today = new Date().toISOString().slice(0, 10)

function emptyForm(): NewFormState {
  return {
    invoice_number:  `INV-${Date.now().toString().slice(-6)}`,
    customer_name:   '',
    customer_email:  '',
    billing_address: '',
    issue_date:      today,
    due_date:        today,
    currency:        'USD',
    notes:           '',
    items:           [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }],
  }
}

function NewInvoiceModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<NewFormState>(emptyForm)
  const create = useCreateInvoice()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name.trim()) return
    if (form.items.some((i) => !i.description.trim())) return

    const payload: CreateInvoicePayload = {
      invoice_number:  form.invoice_number,
      customer_name:   form.customer_name,
      customer_email:  form.customer_email || undefined,
      billing_address: form.billing_address || undefined,
      issue_date:      form.issue_date,
      due_date:        form.due_date,
      currency:        form.currency,
      notes:           form.notes || undefined,
      items:           form.items.map(({ description, quantity, unit_price, tax_rate }) => ({
        description, quantity, unit_price, tax_rate,
      })),
    }
    await create.mutateAsync(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">New Invoice</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Invoice # *</label>
              <input required value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Currency</label>
              <input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 uppercase" />
            </div>
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
              <label className="text-xs text-gray-500">Issue Date *</label>
              <input required type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Due Date *</label>
              <input required type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs text-gray-500">Billing Address</label>
              <textarea value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                rows={2} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Line Items *</label>
            <LineItemsEditor
              items={form.items}
              onChange={(items) => setForm({ ...form, items })}
              quantityType="integer"
              currency={form.currency}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">
            Cancel
          </button>
          <button type="submit" disabled={create.isPending}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoicingPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [showNew, setShowNew]           = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  // debounce search 350ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const { data: invoices = [], isLoading } = useInvoices({
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  })

  const selected = invoices.find((i) => i.id === selectedId) ?? null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <h1 className="text-base font-semibold text-gray-100 mr-2">Invoices</h1>

        {/* Status filter tabs */}
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="bg-gray-800 border border-gray-700 rounded pl-8 pr-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-52"
          />
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus size={13} />
          New Invoice
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-gray-500 text-sm">No invoices found</p>
            <button onClick={() => setShowNew(true)} className="text-xs text-indigo-400 hover:text-indigo-300">Create your first invoice</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Issue Date</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  className={`border-b border-gray-800/60 hover:bg-gray-800/40 cursor-pointer transition-colors ${selectedId === inv.id ? 'bg-gray-800/60' : ''}`}
                >
                  <td className="px-6 py-3 text-indigo-300 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{inv.customer_name}</p>
                    {inv.customer_email && <p className="text-gray-500 text-xs">{inv.customer_email}</p>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(inv.issue_date)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-200">{formatCurrency(inv.total, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <InvoiceDrawer
          invoice={selected}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      )}

      {/* New Invoice Modal */}
      {showNew && <NewInvoiceModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

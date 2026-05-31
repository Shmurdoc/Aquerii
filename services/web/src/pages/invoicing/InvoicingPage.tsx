import { useState, useEffect } from 'react'
import { Search, Plus } from 'lucide-react'
import { useInvoices, useCreateInvoice } from '@/hooks/useInvoices'
import { CreateInvoicePayload, formatCurrency, formatDate } from '@/lib/erp'
import StatusBadge from '@/components/erp/StatusBadge'
import InvoiceDrawer from '@/components/erp/InvoiceDrawer'
import LineItemsEditor, { LineItem } from '@/components/erp/LineItemsEditor'
import { Button, Input, DataTable, type Column } from '@/components/ui'

const STATUSES = ['', 'draft', 'sent', 'paid', 'overdue', 'cancelled']

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
        className="bg-[var(--color-bg-deepest)] border border-[var(--color-glass-border)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-glass-border)]">
          <h2 className="font-semibold text-[var(--color-text-primary)]">New Invoice</h2>
          <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" aria-label="Close"><Plus size={18} className="rotate-45" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Invoice # *</label>
              <input required value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Currency</label>
              <input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] uppercase" />
            </div>
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
              <label className="text-xs text-[var(--color-text-muted)]">Issue Date *</label>
              <input required type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Due Date *</label>
              <input required type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Billing Address</label>
              <textarea value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                rows={2} className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Line Items *</label>
            <LineItemsEditor
              items={form.items}
              onChange={(items) => setForm({ ...form, items })}
              quantityType="integer"
              currency={form.currency}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:border-[var(--color-accent)]" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-glass-border)] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={create.isPending} disabled={create.isPending}>
            Create Invoice
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function InvoicingPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [showNew, setShowNew]           = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const { data: invoices = [], isLoading } = useInvoices({
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  })

  const selected = invoices.find((i: any) => i.id === selectedId) ?? null

  // Summary stats
  const stats = {
    total: invoices.length,
    totalValue: invoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0),
    overdue: invoices.filter((i: any) => i.status === 'overdue').length,
    paid: invoices.filter((i: any) => i.status === 'paid').length,
  }

  const columns: Column<any>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      sortable: true,
      render: (inv: any) => <span className="text-[var(--color-accent-text)] font-mono text-xs">{inv.invoice_number}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      sortable: true,
      render: (inv: any) => (
        <div>
          <p className="text-[var(--color-text-primary)]">{inv.customer_name}</p>
          {inv.customer_email && <p className="text-[10px] text-[var(--color-text-muted)]">{inv.customer_email}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv: any) => <StatusBadge status={inv.status} />,
    },
    {
      key: 'issue_date',
      header: 'Issue Date',
      hideOnMobile: true,
      render: (inv: any) => <span className="text-xs text-[var(--color-text-muted)]">{formatDate(inv.issue_date)}</span>,
    },
    {
      key: 'due_date',
      header: 'Due Date',
      hideOnMobile: true,
      render: (inv: any) => <span className="text-xs text-[var(--color-text-muted)]">{formatDate(inv.due_date)}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      className: 'text-right',
      render: (inv: any) => <span className="font-mono text-[var(--color-text-primary)]">{formatCurrency(inv.total, inv.currency)}</span>,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)]">Total Invoices</p>
          <p className="text-xl font-bold text-[var(--color-text-primary)]">{stats.total}</p>
        </div>
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)]">Total Value</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.totalValue)}</p>
        </div>
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)]">Overdue</p>
          <p className="text-xl font-bold text-red-400">{stats.overdue}</p>
        </div>
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-[var(--color-text-muted)]">Paid</p>
          <p className="text-xl font-bold text-emerald-400">{stats.paid}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] shrink-0">
        <h1 className="text-base font-semibold text-[var(--color-text-primary)] mr-2">Invoices</h1>

        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded transition-colors ${statusFilter === s ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'}`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices…"
            containerClassName="!mb-0"
            className="!pl-8 !w-52"
          />
        </div>

        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus size={13} /> New Invoice
        </Button>
      </div>

      <div className="flex-1 overflow-auto animate-fade-in">
        <DataTable
          columns={columns}
          data={invoices}
          keyExtractor={(inv: any) => inv.id}
          isLoading={isLoading}
          emptyTitle="No invoices found"
          emptyDescription="Create your first invoice to get started."
        />
      </div>

      {selected && (
        <InvoiceDrawer
          invoice={selected}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      )}

      {showNew && <NewInvoiceModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

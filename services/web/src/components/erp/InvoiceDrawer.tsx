/**
 * InvoiceDrawer — right-side panel for a single invoice.
 * Covers: view, status change (header-only update), delete.
 * Note: backend update does NOT accept item changes — items are frozen after creation.
 */

import { useState } from 'react'
import { X, Trash2, ChevronDown } from 'lucide-react'
import { Invoice, UpdateInvoicePayload, formatCurrency, formatDate } from '@/lib/erp'
import { useUpdateInvoice, useDeleteInvoice } from '@/hooks/useInvoices'
import StatusBadge from '@/components/erp/StatusBadge'
import LineItemsEditor, { LineItem } from '@/components/erp/LineItemsEditor'

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

interface Props {
  invoice: Invoice
  onClose: () => void
  onDeleted: () => void
}

export default function InvoiceDrawer({ invoice, onClose, onDeleted }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateInvoicePayload>({
    status:          invoice.status,
    invoice_number:  invoice.invoice_number,
    customer_name:   invoice.customer_name,
    customer_email:  invoice.customer_email ?? '',
    billing_address: invoice.billing_address ?? '',
    due_date:        invoice.due_date,
    notes:           invoice.notes ?? '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMutation = useUpdateInvoice()
  const deleteMutation = useDeleteInvoice()

  // read-only line items cast to LineItem[] shape
  const lineItems: LineItem[] = (invoice.items ?? []).map((item) => ({
    description: item.description,
    quantity:    item.quantity,
    unit_price:  item.unit_price,
    tax_rate:    item.tax_rate,
    total:       item.total,
  }))

  async function handleSave() {
    await updateMutation.mutateAsync({ id: invoice.id, payload: form })
    setEditing(false)
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync(invoice.id)
    onDeleted()
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[560px] bg-gray-900 border-l border-gray-800 flex flex-col z-40 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-100 text-sm">{invoice.invoice_number}</span>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
            >
              Edit
            </button>
          )}
          <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {/* Customer info */}
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</h3>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Name *</label>
                <input
                  value={form.customer_name ?? ''}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Email</label>
                <input
                  type="email"
                  value={form.customer_email ?? ''}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs text-gray-500">Billing Address</label>
                <textarea
                  value={form.billing_address ?? ''}
                  onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                  rows={2}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-300">
              <p className="font-medium">{invoice.customer_name}</p>
              {invoice.customer_email && <p className="text-gray-400">{invoice.customer_email}</p>}
              {invoice.billing_address && <p className="text-gray-500 mt-1 text-xs">{invoice.billing_address}</p>}
            </div>
          )}
        </section>

        {/* Dates + status */}
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h3>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Invoice #</label>
                <input
                  value={form.invoice_number ?? ''}
                  onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Status</label>
                <div className="relative">
                  <select
                    value={form.status ?? invoice.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="appearance-none w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 pr-7"
                  >
                    {INVOICE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Due Date</label>
                <input
                  type="date"
                  value={form.due_date ?? ''}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-500">Issued</span><p className="text-gray-200">{formatDate(invoice.issue_date)}</p></div>
              <div><span className="text-gray-500">Due</span><p className="text-gray-200">{formatDate(invoice.due_date)}</p></div>
              <div><span className="text-gray-500">Currency</span><p className="text-gray-200">{invoice.currency}</p></div>
              {invoice.paid_at && <div><span className="text-gray-500">Paid</span><p className="text-emerald-400">{formatDate(invoice.paid_at)}</p></div>}
            </div>
          )}
        </section>

        {/* Notes */}
        {editing ? (
          <section className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500"
            />
          </section>
        ) : (
          invoice.notes && (
            <section className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Notes</span>
              <p className="text-sm text-gray-400">{invoice.notes}</p>
            </section>
          )
        )}

        {/* Line items — always read-only (backend doesn't allow item update) */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</h3>
          <LineItemsEditor
            items={lineItems}
            onChange={() => {}}
            quantityType="integer"
            currency={invoice.currency}
            readOnly
          />
        </section>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400"
          >
            <Trash2 size={13} />
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Delete this invoice?</span>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Save / Cancel */}
        {editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(false)}
              className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

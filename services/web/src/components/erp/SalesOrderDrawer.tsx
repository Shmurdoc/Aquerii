/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck � pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useState } from 'react'
import { X, Trash2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { SalesOrder, UpdateSOPayload, SOStatus, formatCurrency, formatDate, erpSalesOrdersExtra } from '@/lib/erp'
import { useUpdateSalesOrder, useDeleteSalesOrder } from '@/hooks/useSalesOrders'
import StatusBadge from '@/components/erp/StatusBadge'
import LineItemsEditor, { LineItem } from '@/components/erp/LineItemsEditor'

const SO_STATUSES: SOStatus[] = ['draft', 'quotation', 'confirmed', 'shipped', 'delivered', 'cancelled']

interface Props {
  so: SalesOrder
  onClose: () => void
  onDeleted: () => void
}

export default function SalesOrderDrawer({ so, onClose, onDeleted }: Props) {
  const [editing, setEditing]       = useState(false)
  const [form, setForm]             = useState({
    customer_name:    so.customer_name,
    customer_email:   so.customer_email ?? '',
    status:           so.status as SOStatus,
    currency:         so.currency,
    order_date:       so.order_date,
    expected_date:    so.expected_date ?? '',
    shipping_address: so.shipping_address ?? '',
    notes:            so.notes ?? '',
  })
  const [items, setItems] = useState<LineItem[]>(
    (so.items ?? []).map((i) => ({
      description: i.description,
      quantity:    i.quantity,
      unit_price:  i.unit_price,
      tax_rate:    i.tax_rate,
      total:       i.total,
    }))
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMutation = useUpdateSalesOrder()
  const deleteMutation = useDeleteSalesOrder()

  async function handleSave() {
    const payload: UpdateSOPayload = {
      customer_name:    form.customer_name,
      customer_email:   form.customer_email || undefined,
      status:           form.status,
      currency:         form.currency,
      order_date:       form.order_date,
      expected_date:    form.expected_date || undefined,
      shipping_address: form.shipping_address || undefined,
      notes:            form.notes || undefined,
      items: items.map(({ description, quantity, unit_price, tax_rate }) => ({
        description, quantity, unit_price, tax_rate,
      })),
    }
    await updateMutation.mutateAsync({ id: so.id, payload })
    setEditing(false)
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync(so.id)
    onDeleted()
  }

  async function handleConvertToInvoice() {
    try {
      await erpSalesOrdersExtra.convertToInvoice(so.id)
      toast.success('Invoice created from sales order.')
      onDeleted()
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to convert.')
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[580px] bg-gray-900 border-l border-gray-800 flex flex-col z-40 shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-100 text-sm font-mono">{so.order_number}</span>
          <StatusBadge status={so.status} />
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Edit</button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</h3>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Name *</label>
                <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Email</label>
                <input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs text-gray-500">Shipping Address</label>
                <textarea value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                  rows={2} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-300">
              <p className="font-medium">{so.customer_name}</p>
              {so.customer_email && <p className="text-gray-400">{so.customer_email}</p>}
              {so.shipping_address && <p className="text-gray-500 mt-1 text-xs">{so.shipping_address}</p>}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h3>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Status</label>
                <div className="relative">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SOStatus })}
                    className="appearance-none w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 pr-7">
                    {SO_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
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
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-500">Order Date</span><p className="text-gray-200">{formatDate(so.order_date)}</p></div>
              <div><span className="text-gray-500">Expected</span><p className="text-gray-200">{formatDate(so.expected_date)}</p></div>
              <div><span className="text-gray-500">Currency</span><p className="text-gray-200">{so.currency}</p></div>
            </div>
          )}
        </section>

        {editing ? (
          <section className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500" />
          </section>
        ) : (
          so.notes && <section className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Notes</span>
            <p className="text-sm text-gray-400">{so.notes}</p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</h3>
          <LineItemsEditor
            items={items}
            onChange={editing ? setItems : () => {}}
            quantityType="float"
            currency={form.currency}
            readOnly={!editing}
          />
        </section>
      </div>

      <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400">
              <Trash2 size={13} />Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete this SO?</span>
              <button onClick={handleDelete} disabled={deleteMutation.isPending}
                className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
            </div>
          )}
          {so.status === 'confirmed' && (
            <button onClick={handleConvertToInvoice}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white">
              Convert to Invoice
            </button>
          )}
        </div>
        {editing && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)}
              className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
            <button onClick={handleSave} disabled={updateMutation.isPending}
              className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * LineItemsEditor — shared across Invoice, PO, and SO create/edit forms.
 *
 * Props:
 *   items        — controlled array of line items
 *   onChange     — called with full updated array on any change
 *   quantityType — 'integer' (invoices) | 'float' (PO/SO)
 *   currency     — ISO 3-letter code for display (default ZAR)
 *   readOnly     — disables all editing (for view drawers)
 */

import { Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/erp'

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  total: number
}

interface Props {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  quantityType?: 'integer' | 'float'
  currency?: string
  readOnly?: boolean
}

function calcTotal(item: Omit<LineItem, 'total'>): number {
  const base = item.quantity * item.unit_price
  return base + base * (item.tax_rate / 100)
}

const EMPTY: LineItem = { description: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }

export default function LineItemsEditor({ items, onChange, quantityType = 'float', currency = 'ZAR', readOnly = false }: Props) {
  function update(index: number, patch: Partial<LineItem>) {
    const next = items.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, ...patch }
      updated.total = calcTotal(updated)
      return updated
    })
    onChange(next)
  }

  function addRow() {
    onChange([...items, { ...EMPTY }])
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unit_price, 0)
  const taxTotal = items.reduce((s, item) => s + item.quantity * item.unit_price * (item.tax_rate / 100), 0)
  const total = subtotal + taxTotal

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_100px_80px_100px_32px] gap-2 px-1 text-xs text-gray-500 uppercase tracking-wide">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit Price</span>
        <span>Tax %</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_80px_100px_80px_100px_32px] gap-2 items-center">
          <input
            type="text"
            value={item.description}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder="Description"
            disabled={readOnly}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          />
          <input
            type="number"
            value={item.quantity}
            min={quantityType === 'integer' ? 1 : 0.01}
            step={quantityType === 'integer' ? 1 : 0.01}
            onChange={(e) => {
              const v = quantityType === 'integer' ? parseInt(e.target.value) || 1 : parseFloat(e.target.value) || 0.01
              update(i, { quantity: v })
            }}
            disabled={readOnly}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          />
          <input
            type="number"
            value={item.unit_price}
            min={0}
            step={0.01}
            onChange={(e) => update(i, { unit_price: parseFloat(e.target.value) || 0 })}
            disabled={readOnly}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          />
          <input
            type="number"
            value={item.tax_rate}
            min={0}
            max={100}
            step={0.1}
            onChange={(e) => update(i, { tax_rate: parseFloat(e.target.value) || 0 })}
            disabled={readOnly}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          />
          <span className="text-right text-sm text-gray-200 font-mono">
            {formatCurrency(item.total, currency)}
          </span>
          {!readOnly ? (
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={items.length === 1}
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}

      {/* Add row */}
      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mt-1 w-fit"
        >
          <Plus size={13} />
          Add line item
        </button>
      )}

      {/* Totals footer */}
      <div className="mt-3 border-t border-gray-700 pt-3 flex flex-col items-end gap-1 text-sm">
        <div className="flex gap-8 text-gray-400">
          <span>Subtotal</span>
          <span className="font-mono w-28 text-right">{formatCurrency(subtotal, currency)}</span>
        </div>
        <div className="flex gap-8 text-gray-400">
          <span>Tax</span>
          <span className="font-mono w-28 text-right">{formatCurrency(taxTotal, currency)}</span>
        </div>
        <div className="flex gap-8 text-gray-100 font-semibold border-t border-gray-700 pt-1 mt-1">
          <span>Total</span>
          <span className="font-mono w-28 text-right">{formatCurrency(total, currency)}</span>
        </div>
      </div>
    </div>
  )
}

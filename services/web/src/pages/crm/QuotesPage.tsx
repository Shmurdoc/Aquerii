/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck � pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCrmQuotes, useCreateCrmQuote, useDeleteCrmQuote, useSendCrmQuote, useAcceptCrmQuote, useRejectCrmQuote, CrmQuote } from '@/lib/crm'
import { Card, Badge, Button, DataTable, type Column, PrintButton, ExportButton } from '@/components/ui'
import { Plus, Trash2, Send, Check, X, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '@/lib/erp'

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'danger'> = {
  draft: 'default',
  sent: 'primary',
  accepted: 'success',
  rejected: 'danger',
}

function NewQuoteModal({ onClose }: { onClose: () => void }) {
  const w = useAuthStore(s => s.workspace?.id)
  const create = useCreateCrmQuote(w)
  const [form, setForm] = useState({ quote_number: `QT-${Date.now().toString().slice(-6)}`, contact_id: '', notes: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await create.mutateAsync({ ...form, subtotal: 0, tax_total: 0, total: 0 } as any)
    toast.success('Quote created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Quote</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X size={14} /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Quote number" value={form.quote_number} onChange={e => setForm(f => ({ ...f, quote_number: e.target.value }))} required />
          <textarea className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Notes" value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <Button type="submit" loading={create.isPending}>Create Quote</Button>
        </form>
      </Card>
    </div>
  )
}

export default function QuotesPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const { data: quotes = [], isLoading } = useCrmQuotes(w)
  const deleteQuote = useDeleteCrmQuote(w, '')
  const sendQuote = useSendCrmQuote(w, '')
  const acceptQuote = useAcceptCrmQuote(w, '')
  const rejectQuote = useRejectCrmQuote(w, '')
  const [showAdd, setShowAdd] = useState(false)

  const columns: Column<CrmQuote>[] = [
    { key: 'quote_number', header: 'Quote #', render: r => <span className="font-medium">{r.quote_number}</span> },
    { key: 'status', header: 'Status', render: r => <Badge variant={statusColors[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'total', header: 'Total', render: r => formatCurrency(r.total) },
    { key: 'valid_until', header: 'Valid Until', render: r => formatDate(r.valid_until) },
    { key: 'created_at', header: 'Created', render: r => formatDate(r.created_at) },
    { key: 'id', header: 'Actions', render: r => (
      <div className="flex gap-1">
        {r.status === 'draft' && (
          <Button variant="ghost" size="sm" onClick={async () => { await sendQuote.mutateAsync(r.id); toast.success('Quote sent.') }}>
            <Send size={12} />
          </Button>
        )}
        {r.status === 'sent' && (
          <>
            <Button variant="ghost" size="sm" onClick={async () => { await acceptQuote.mutateAsync(r.id); toast.success('Quote accepted.') }}>
              <Check size={12} />
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { await rejectQuote.mutateAsync(r.id); toast.success('Quote rejected.') }}>
              <X size={12} />
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={async () => {
          if (confirm('Delete this quote?')) {
            await deleteQuote.mutateAsync(r.id)
            toast.success('Quote deleted.')
          }
        }}><Trash2 size={12} /></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CRM Quotes</h1>
        <div className="flex items-center gap-2">
          <ExportButton entity="quotes" />
          <PrintButton label="Quotes" />
          <Button onClick={() => setShowAdd(true)}><Plus size={14} /> New Quote</Button>
        </div>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={quotes} loading={isLoading} emptyMessage="No quotes yet" />
      </Card>
      {showAdd && <NewQuoteModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

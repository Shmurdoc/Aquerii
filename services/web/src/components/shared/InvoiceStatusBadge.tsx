import React from 'react'

type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  sent:      { label: 'Sent',      className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  partial:   { label: 'Partial',   className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  paid:      { label: 'Paid',      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  overdue:   { label: 'Overdue',   className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-600/20 text-gray-500 border-gray-600/30' },
}

interface Props {
  status: InvoiceStatus
  className?: string
}

export function InvoiceStatusBadge({ status, className = '' }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  )
}

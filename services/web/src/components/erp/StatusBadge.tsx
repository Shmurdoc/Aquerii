/**
 * StatusBadge — renders a colored pill for any ERP status value.
 * Color map covers all status enums across all ERP modules.
 */

interface Props {
  status: string
  className?: string
}

const COLOR_MAP: Record<string, string> = {
  // Invoicing
  draft:      'bg-gray-700 text-gray-300',
  sent:       'bg-blue-900/60 text-blue-300',
  paid:       'bg-emerald-900/60 text-emerald-300',
  overdue:    'bg-red-900/60 text-red-300',
  // PO / SO shared
  confirmed:  'bg-indigo-900/60 text-indigo-300',
  cancelled:  'bg-red-900/40 text-red-400',
  // PO specific
  received:   'bg-teal-900/60 text-teal-300',
  // SO specific
  quotation:  'bg-yellow-900/60 text-yellow-300',
  shipped:    'bg-cyan-900/60 text-cyan-300',
  delivered:  'bg-emerald-900/60 text-emerald-300',
  // Stock
  in_stock:   'bg-emerald-900/60 text-emerald-300',
  reserved:   'bg-yellow-900/60 text-yellow-300',
  sold:       'bg-blue-900/60 text-blue-300',
  damaged:    'bg-orange-900/60 text-orange-300',
  expired:    'bg-red-900/60 text-red-300',
  // Accounting
  active:     'bg-emerald-900/60 text-emerald-300',
  inactive:   'bg-gray-700 text-gray-400',
}

const LABEL_MAP: Record<string, string> = {
  in_stock: 'In Stock',
}

export default function StatusBadge({ status, className = '' }: Props) {
  const color = COLOR_MAP[status] ?? 'bg-gray-700 text-gray-300'
  const label = LABEL_MAP[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color} ${className}`}>
      {label}
    </span>
  )
}

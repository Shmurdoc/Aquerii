import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  usePermits,
  PERMIT_TYPES, PERMIT_STATUSES,
  PERMIT_STATUS_COLORS, PERMIT_RISK_COLORS,
  formatPermitType, formatPermitStatus, isHighRiskType,
  type Permit, type PermitType, type PermitStatus,
} from '@/lib/ptw'
import { Card, Badge, Button, Select, Input, DataTable, ExportButton, PrintButton } from '@/components/ui'
import { FileCheck2, Search } from 'lucide-react'
import clsx from 'clsx'
import type { Column } from '@/components/ui/DataTable'

export default function PermitRegister() {
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filters = useMemo(() => ({
    type: (filterType || undefined) as PermitType | undefined,
    status: (filterStatus || undefined) as PermitStatus | undefined,
  }), [filterType, filterStatus])

  const { data: permits, isLoading } = usePermits(Object.keys(filters).length > 0 ? filters : undefined)

  const filtered = useMemo(() => {
    if (!permits) return []
    return permits.filter(p => {
      if (filterSearch) {
        const q = filterSearch.toLowerCase()
        if (!p.reference.toLowerCase().includes(q) && !p.title.toLowerCase().includes(q) && !p.location?.toLowerCase().includes(q)) {
          return false
        }
      }
      if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(p.created_at) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [permits, filterSearch, dateFrom, dateTo])

  const columns: Column<Permit>[] = [
    {
      key: 'reference',
      header: 'Permit #',
      sortable: true,
      render: (p) => (
        <button
          onClick={() => navigate(`/ptw/permits/${p.id}`)}
          className="text-xs font-mono text-indigo-400 hover:underline"
        >
          {p.reference}
        </button>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      className: 'w-36',
      render: (p) => (
        <Badge className="text-[10px]">{formatPermitType(p.type)}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'w-28',
      render: (p) => (
        <Badge className={clsx('text-[10px]', PERMIT_STATUS_COLORS[p.status])}>
          {formatPermitStatus(p.status)}
        </Badge>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      hideOnMobile: true,
      render: (p) => <span className="text-xs">{p.location}</span>,
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      className: 'w-28',
      hideOnMobile: true,
      render: (p) => <span className="text-xs">{new Date(p.created_at).toLocaleDateString()}</span>,
    },
    {
      key: 'risk_level',
      header: 'Workers',
      sortable: false,
      className: 'w-20 text-center',
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {p.holder ? '1 assigned' : '0'}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="flex items-center gap-3">
          <FileCheck2 size={20} className="text-emerald-400" />
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Permit Register</h1>
        </div>
        <div className="flex gap-2">
          <ExportButton entity="permits" label="Export" />
          <PrintButton label="Register" />
          <Button onClick={() => navigate('/ptw/permits/new')} variant="primary">
            New Permit
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-[var(--color-glass-border)]">
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-36"
          size="sm"
        >
          <option value="">All types</option>
          {PERMIT_TYPES.map(t => <option key={t} value={t}>{formatPermitType(t)}</option>)}
        </Select>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-36"
          size="sm"
        >
          <option value="">All statuses</option>
          {PERMIT_STATUSES.map(s => <option key={s} value={s}>{formatPermitStatus(s)}</option>)}
        </Select>
        <Input
          size="sm"
          placeholder="Search permits..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          icon={Search}
          className="w-48"
        />
        <Input
          size="sm"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36"
          placeholder="From"
        />
        <Input
          size="sm"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36"
          placeholder="To"
        />
      </div>

      <div className="flex-1 px-6 py-4">
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          emptyTitle="No permits found"
          emptyDescription="Try adjusting your filters or create a new permit."
        />
      </div>
    </div>
  )
}

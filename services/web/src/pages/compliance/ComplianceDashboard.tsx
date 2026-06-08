import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useComplianceDashboard,
  COMPLIANCE_STATUS_COLORS,
  formatComplianceStatus,
  type WorkerCompliance,
  type ComplianceStatus,
} from '@/lib/compliance'
import { useEquipmentSummary } from '@/lib/equipment'
import { Card, Badge, Input } from '@/components/ui'
import { Shield, Users, AlertTriangle, CheckCircle, Clock, Search, ChevronDown, ChevronRight, Wrench, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'

const DISTRIBUTION_COLORS: Record<ComplianceStatus, string> = {
  compliant: 'bg-emerald-500',
  expiring: 'bg-amber-500',
  non_compliant: 'bg-red-500',
  unknown: 'bg-[var(--color-status-todo)]',
}

export default function ComplianceDashboard() {
  const navigate = useNavigate()
  const { data: dashboard, isLoading } = useComplianceDashboard()
  const { data: equipSummary } = useEquipmentSummary()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading || !dashboard) {
    return (
      <div className="p-6 text-[var(--color-text-muted)] animate-pulse">Loading compliance dashboard...</div>
    )
  }

  const { summary, distribution, workers } = dashboard

  const filtered = workers.filter(w => {
    if (!search) return true
    const q = search.toLowerCase()
    return w.name.toLowerCase().includes(q) || (w.badge_id?.toLowerCase().includes(q) ?? false)
  })

  const total = summary.total_workers || 1

  const renderBar = () => (
    <div className="flex h-3 rounded-full overflow-hidden">
      {Object.entries(distribution).map(([status, count]) => {
        if (count === 0) return null
        const pct = (count / total) * 100
        return (
          <div
            key={status}
            className={DISTRIBUTION_COLORS[status as ComplianceStatus]}
            style={{ width: `${pct}%` }}
            title={`${formatComplianceStatus(status as ComplianceStatus)}: ${count}`}
          />
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <Shield size={20} className="text-emerald-400" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Compliance Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4">
        <SummaryCard
          label="Total Workers"
          value={summary.total_workers}
          icon={Users}
          color="text-blue-400"
        />
        <SummaryCard
          label="Compliant"
          value={summary.compliant}
          icon={CheckCircle}
          color="text-emerald-400"
        />
        <SummaryCard
          label="Expiring Soon"
          value={summary.expiring_soon}
          icon={Clock}
          color="text-amber-400"
        />
        <SummaryCard
          label="Non-Compliant"
          value={summary.non_compliant}
          icon={AlertTriangle}
          color="text-red-400"
        />
      </div>

      {equipSummary && (
        <div className="px-6 pb-4">
          <Card
            variant="interactive"
            className="p-4 flex items-center gap-4"
            onClick={() => navigate('/equipment')}
          >
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Wrench size={18} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Equipment Compliance</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-lg font-bold text-[var(--color-text-primary)]">{equipSummary.total} total</span>
                <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={12} /> {equipSummary.compliant} compliant</span>
                <span className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle size={12} /> {equipSummary.non_compliant} non-compliant</span>
              </div>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">View all &rarr;</span>
          </Card>
        </div>
      )}

      <div className="px-6 pb-4">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Compliance Distribution</h2>
          {renderBar()}
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(distribution).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs">
                <span className={clsx('w-2 h-2 rounded-full', DISTRIBUTION_COLORS[status as ComplianceStatus])} />
                <span className="text-[var(--color-text-muted)]">{formatComplianceStatus(status as ComplianceStatus)}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="px-6 pb-4">
        <Input
          size="sm"
          icon={Search}
          placeholder="Search by name or badge ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm"
        />
      </div>

      <div className="flex-1 px-6 pb-6 space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield size={32} className="mx-auto text-[var(--color-text-muted)] mb-2" />
            <p className="text-[var(--color-text-muted)]">No workers found.</p>
          </Card>
        ) : (
          filtered.map(w => (
            <WorkerRow
              key={w.id}
              worker={w}
              expanded={expandedId === w.id}
              onToggle={() => setExpandedId(expandedId === w.id ? null : w.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: LucideIcon; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
    </Card>
  )
}

function WorkerRow({ worker, expanded, onToggle }: { worker: WorkerCompliance; expanded: boolean; onToggle: () => void }) {
  const statusBadge = (s: ComplianceStatus) => {
    switch (s) {
      case 'compliant': return <Badge variant="success" size="sm">Compliant</Badge>
      case 'expiring': return <Badge variant="warning" size="sm">Expiring</Badge>
      case 'non_compliant': return <Badge variant="danger" size="sm">Non-Compliant</Badge>
      default: return <Badge size="sm">Unknown</Badge>
    }
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <Card className={clsx(
          'p-3 flex items-center gap-3 transition-colors hover:border-[var(--color-glass-border-hover)]',
          expanded && 'border-[var(--color-accent)]',
        )}>
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
            worker.overall_status === 'compliant' ? 'bg-emerald-500/10 text-emerald-400' :
            worker.overall_status === 'expiring' ? 'bg-amber-500/10 text-amber-400' :
            'bg-red-500/10 text-red-400',
          )}>
            {worker.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{worker.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{worker.badge_id ?? 'No badge'} • {worker.role ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(worker.overall_status)}
            {expanded ? <ChevronDown size={14} className="text-[var(--color-text-muted)]" /> : <ChevronRight size={14} className="text-[var(--color-text-muted)]" />}
          </div>
        </Card>
      </button>
      {expanded && (
        <div className="ml-4 mt-1 animate-fade-in">
          <Card className="p-3 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">Certification Details</h3>
            {worker.certifications.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">No certifications recorded.</p>
            ) : (
              worker.certifications.map(cert => (
                <div key={cert.id} className="flex items-center justify-between py-1.5 border-b border-[var(--color-glass-border)] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{cert.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {cert.issued_at ? `Issued: ${new Date(cert.issued_at).toLocaleDateString()}` : 'Not issued'} |
                      {cert.expires_at ? ` Expires: ${new Date(cert.expires_at).toLocaleDateString()}` : ' No expiry'}
                    </p>
                  </div>
                  <Badge
                    size="sm"
                    variant={cert.status === 'valid' ? 'success' : cert.status === 'expiring_soon' ? 'warning' : 'danger'}
                  >
                    {cert.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

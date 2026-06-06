import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  usePermits, useDeletePermit, usePermitTransition,
  PERMIT_TYPES, PERMIT_STATUSES, PERMIT_RISK_LEVELS,
  PERMIT_STATUS_COLORS, PERMIT_RISK_COLORS,
  formatPermitType, formatPermitStatus, isHighRiskType,
  type Permit, type PermitType, type PermitStatus, type PermitRiskLevel, type Transition,
} from '@/lib/ptw'
import { Card, Badge, Button, Select, PrintButton, ExportButton } from '@/components/ui'
import { Plus, FileCheck2, X, Download } from 'lucide-react'
import { useDmrRegister } from '@/lib/ptw'
import clsx from 'clsx'

export default function PermitsPage() {
  const [filters, setFilters] = useState<{ status?: PermitStatus; type?: PermitType; risk_level?: PermitRiskLevel; active?: boolean }>({})
  const [showRegister, setShowRegister] = useState(false)
  const navigate = useNavigate()
  const { data: permits, isLoading } = usePermits(filters)
  const del = useDeletePermit()
  const transition = usePermitTransition()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="flex items-center gap-3">
          <FileCheck2 size={20} className="text-emerald-400" />
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Permits to Work</h1>
        </div>
        <div className="flex gap-2">
          <ExportButton entity="permits" />
          <PrintButton label="Permits" />
          <Button onClick={() => setShowRegister(true)} variant="outline">
            <Download size={14} /> DMR Register
          </Button>
          <Button onClick={() => navigate('/ptw/permits/new')} variant="primary">
            <Plus size={14} /> New Permit
          </Button>
        </div>
      </div>

      <div className="flex gap-2 px-6 py-3 border-b border-[var(--color-glass-border)]">
        <Select
          value={filters.status ?? ''}
          onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as PermitStatus })}
          className="text-xs"
        >
          <option value="">All statuses</option>
          {PERMIT_STATUSES.map((s) => <option key={s} value={s}>{formatPermitStatus(s)}</option>)}
        </Select>
        <Select
          value={filters.type ?? ''}
          onChange={(e) => setFilters({ ...filters, type: (e.target.value || undefined) as PermitType })}
          className="text-xs"
        >
          <option value="">All types</option>
          {PERMIT_TYPES.map((t) => <option key={t} value={t}>{formatPermitType(t)}</option>)}
        </Select>
        <Select
          value={filters.risk_level ?? ''}
          onChange={(e) => setFilters({ ...filters, risk_level: (e.target.value || undefined) as PermitRiskLevel })}
          className="text-xs"
        >
          <option value="">Any risk</option>
          {PERMIT_RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={!!filters.active}
            onChange={(e) => setFilters({ ...filters, active: e.target.checked })}
          />
          Active only
        </label>
      </div>

      <div className="flex-1 px-6 py-4">
        {isLoading ? (
          <p className="text-[var(--color-text-muted)] animate-pulse">Loading...</p>
        ) : !permits || permits.length === 0 ? (
          <Card className="p-8 text-center">
            <FileCheck2 size={32} className="mx-auto text-zinc-500 mb-2" />
            <p className="text-[var(--color-text-muted)]">No permits yet. Issue your first permit to start tracking high-risk work.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {permits.map((p) => (
              <Card
                key={p.id}
                className="p-4 hover:border-indigo-500/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/ptw/permits/${p.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">{p.reference}</span>
                      <Badge className={clsx('text-[10px]', PERMIT_STATUS_COLORS[p.status])}>
                        {formatPermitStatus(p.status)}
                      </Badge>
                      <Badge className={clsx('text-[10px]', PERMIT_RISK_COLORS[p.risk_level])}>
                        {p.risk_level}
                      </Badge>
                      {isHighRiskType(p.type) && (
                        <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">High risk</Badge>
                      )}
                      <Badge className="text-[10px]">{formatPermitType(p.type)}</Badge>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{p.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">📍 {p.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {p.valid_until ? `Expires ${new Date(p.valid_until).toLocaleDateString()}` : `Created ${new Date(p.created_at).toLocaleDateString()}`}
                    </p>
                    {p.holder && (
                      <p className="text-[10px] text-[var(--color-text-muted)]">Holder: {p.holder.name}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showRegister && (
        <DmrRegisterModal onClose={() => setShowRegister(false)} />
      )}
    </div>
  )
}

function DmrRegisterModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useDmrRegister()
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">DMR Permit Register</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X size={18} />
          </button>
        </div>
        {isLoading || !data ? (
          <p className="text-[var(--color-text-muted)] animate-pulse">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-[var(--color-text-muted)]">
              <p><strong>{data.register.authority}</strong></p>
              <p>{data.register.regulation}</p>
              <p>Generated {new Date(data.register.generated_at).toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Total" value={data.register.summary.total} />
              <Stat label="Active" value={data.register.summary.active_count} color="text-emerald-400" />
              <Stat label="Suspended" value={data.register.summary.suspended_count} color="text-amber-400" />
              <Stat label="High risk" value={data.register.summary.high_risk_count} color="text-red-400" />
            </div>
            {data.register.permits.length === 0 ? (
              <p className="text-[var(--color-text-muted)]">No approved/issued permits to report.</p>
            ) : (
              <div className="space-y-2">
                {data.register.permits.map((p) => (
                  <div key={p.id} className="border border-[var(--color-glass-border)] rounded p-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-mono">{p.reference}</span>
                      <Badge className={clsx('text-[10px]', PERMIT_STATUS_COLORS[p.status])}>{formatPermitStatus(p.status)}</Badge>
                    </div>
                    <p className="mt-1">{p.title}</p>
                    <p className="text-[var(--color-text-muted)] mt-1">
                      {formatPermitType(p.type)} • {p.hazards.length} hazard(s) • {p.isolations.length} isolation(s)
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="border border-[var(--color-glass-border)] rounded p-2 text-center">
      <p className={clsx('text-2xl font-semibold', color)}>{value}</p>
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase">{label}</p>
    </div>
  )
}

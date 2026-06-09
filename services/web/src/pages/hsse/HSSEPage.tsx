import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard, useIncidents, useHazards, useActions, SEVERITY_COLORS, RISK_LEVEL_COLORS, ACTION_STATUS_COLORS, formatIncidentType } from '@/lib/hsse'
import { Card, Badge } from '@/components/ui'
import { Shield, AlertTriangle, TrendingUp, CheckCircle, Activity, Target, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'informational']
const RISK_ORDER = ['extreme', 'high', 'medium', 'low']

export default function HSSEPage() {
  const [days, setDays] = useState(30)
  const { data: stats, isLoading } = useDashboard(days)
  const { data: incidents } = useIncidents()
  const { data: hazards } = useHazards()
  const { data: actions } = useActions()

  const overdueActions = useMemo(
    () => (actions ?? []).filter((a) => a.status === 'overdue').length,
    [actions],
  )

  const extremeHazards = useMemo(
    () => (hazards ?? []).filter((h) => h.risk_level === 'extreme' || h.risk_level === 'high').length,
    [hazards],
  )

  const openIncidents = useMemo(
    () => (incidents ?? []).filter((i) => i.status === 'open' || i.status === 'under_investigation').length,
    [incidents],
  )

  if (isLoading || !stats) {
    return (
      <div className="p-6 text-[var(--color-text-muted)] animate-pulse">Loading HSSE dashboard...</div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Shield size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">HSSE Dashboard</h1>
            <p className="text-xs text-[var(--color-text-muted)]">Health, Safety, Security, Environment</p>
          </div>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-glass-bg)] border border-[var(--color-glass-border)] text-[var(--color-text-primary)]"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4 animate-slide-up" style={{ animationDelay: '50ms' }}>
        <KpiCard
          label="Open Incidents"
          value={openIncidents}
          icon={AlertTriangle}
          tone={openIncidents > 0 ? 'red' : 'emerald'}
          to="/hsse/incidents"
        />
        <KpiCard
          label="High Risk Hazards"
          value={extremeHazards}
          icon={TrendingUp}
          tone={extremeHazards > 0 ? 'orange' : 'emerald'}
          to="/hsse/hazards"
        />
        <KpiCard
          label="Overdue Actions"
          value={overdueActions}
          icon={Activity}
          tone={overdueActions > 0 ? 'red' : 'emerald'}
          to="/hsse/actions"
        />
        <KpiCard
          label="COIDA Reportable"
          value={stats.incidents.coida_reportable}
          icon={Target}
          tone="amber"
          to="/hsse/incidents"
        />
      </div>

      {/* Severity + Type Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6 pb-4">
        <Card className="p-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Incidents by Severity</h2>
            <Link to="/hsse/incidents" className="text-xs text-indigo-400 hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {SEVERITY_ORDER.map((sev) => {
              const count = stats.incidents.by_severity[sev] ?? 0
              const total = stats.incidents.total || 1
              const pct = (count / total) * 100
              return (
                <div key={sev} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-[var(--color-text-muted)] capitalize">{sev}</div>
                  <div className="flex-1 h-2 rounded-full bg-[var(--color-glass-bg)] overflow-hidden">
                    <div
                      className={clsx('h-full transition-all', SEVERITY_COLORS[sev as keyof typeof SEVERITY_COLORS].split(' ')[1])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm font-medium text-[var(--color-text-primary)]">{count}</div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Hazards by Risk Level</h2>
            <Link to="/hsse/hazards" className="text-xs text-indigo-400 hover:underline">View register →</Link>
          </div>
          <div className="space-y-2">
            {RISK_ORDER.map((lvl) => {
              const count = stats.hazards.by_risk_level[lvl] ?? 0
              const total = stats.hazards.total || 1
              const pct = (count / total) * 100
              return (
                <div key={lvl} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-[var(--color-text-muted)] capitalize">{lvl}</div>
                  <div className="flex-1 h-2 rounded-full bg-[var(--color-glass-bg)] overflow-hidden">
                    <div
                      className={clsx('h-full transition-all', RISK_LEVEL_COLORS[lvl as keyof typeof RISK_LEVEL_COLORS].split(' ')[1])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm font-medium text-[var(--color-text-primary)]">{count}</div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Incidents by Type</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.incidents.by_type)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <Badge key={type} variant="default" className="text-xs">
                  {formatIncidentType(type as any)}: <span className="ml-1 font-semibold">{count}</span>
                </Badge>
              ))}
          </div>
        </Card>

        <Card className="p-4 animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Link
              to="/hsse/incidents"
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-glass-bg)] border border-[var(--color-glass-border)] hover:border-indigo-500/40 transition-colors"
            >
              <AlertTriangle size={16} className="text-red-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Report Incident</p>
                <p className="text-xs text-[var(--color-text-muted)]">Log MHSA-classifiable event</p>
              </div>
            </Link>
            <Link
              to="/hsse/hazards"
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-glass-bg)] border border-[var(--color-glass-border)] hover:border-indigo-500/40 transition-colors"
            >
              <TrendingUp size={16} className="text-orange-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Add Hazard</p>
                <p className="text-xs text-[var(--color-text-muted)]">Risk register entry</p>
              </div>
            </Link>
            <Link
              to="/hsse/actions"
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-glass-bg)] border border-[var(--color-glass-border)] hover:border-indigo-500/40 transition-colors"
            >
              <CheckCircle size={16} className="text-emerald-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Corrective Actions</p>
                <p className="text-xs text-[var(--color-text-muted)]">Track verifications</p>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: number
  icon: LucideIcon
  tone: 'red' | 'orange' | 'amber' | 'emerald'
  to: string
}

function KpiCard({ label, value, icon: Icon, tone, to }: KpiCardProps) {
  const toneClass = {
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  }[tone]

  return (
    <Link
      to={to}
      className={clsx('glass-card p-4 rounded-xl border transition-transform hover:scale-[1.02]', toneClass)}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className={toneClass.split(' ').pop()} />
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
    </Link>
  )
}

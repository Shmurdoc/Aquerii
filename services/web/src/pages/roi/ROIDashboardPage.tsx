import { useState, useMemo } from 'react'
import { useROIDashboard } from '@/lib/roi'
import { formatCurrencyWithSeparator } from '@/lib/currency'
import { Card, Select, Button } from '@/components/ui'
import { BarChart } from '@/components/charts/BarChart'
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  BarChart3,
  Wallet,
  RefreshCw,
  PiggyBank,
  AlertTriangle,
} from 'lucide-react'

type RangePreset = '7d' | '30d' | '90d' | 'custom'

function formatZAR(amount: number): string {
  return formatCurrencyWithSeparator(amount, 'ZAR')
}

function getDateRange(preset: RangePreset) {
  const to = new Date()
  const from = new Date()
  if (preset === '7d') from.setDate(to.getDate() - 7)
  else if (preset === '30d') from.setDate(to.getDate() - 30)
  else if (preset === '90d') from.setDate(to.getDate() - 90)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

function formatWeekLabel(week: string): string {
  const d = new Date(week)
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
  }
  return week
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  subtitle?: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">{value}</p>
      {subtitle && (
        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{subtitle}</p>
      )}
    </Card>
  )
}

export default function ROIDashboardPage() {
  const [preset, setPreset] = useState<RangePreset>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const { from, to } = useMemo(() => {
    if (preset === 'custom') return { from: customFrom || undefined, to: customTo || undefined }
    return getDateRange(preset)
  }, [preset, customFrom, customTo])

  const { data, isLoading, isError, error, refetch } = useROIDashboard(from, to)

  const trendDirection = useMemo(() => {
    if (!data || data.compliance_rate_trend.length < 2) return 'flat'
    const arr = data.compliance_rate_trend
    return arr[arr.length - 1].rate > arr[0].rate ? 'up'
      : arr[arr.length - 1].rate < arr[0].rate ? 'down' : 'flat'
  }, [data])

  const isEmpty = data && data.total_potential_savings === 0 && data.roi_ratio === 0

  const header = (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <BarChart3 size={20} className="text-emerald-400" />
      </div>
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">ROI Dashboard</h1>
      {!isLoading && (
        <div className="ml-auto flex items-center gap-2">
          <Select size="sm" value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="custom">Custom</option>
          </Select>
          {preset === 'custom' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 px-2 rounded-md bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] text-xs text-[var(--color-text-primary)]"
              />
              <span className="text-xs text-[var(--color-text-muted)]">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 px-2 rounded-md bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] text-xs text-[var(--color-text-primary)]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {header}
        <div className="p-6 space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="h-4 w-24 rounded bg-[var(--color-bg-hover)]" />
                <div className="h-8 w-28 rounded bg-[var(--color-bg-hover)]" />
              </Card>
            ))}
          </div>
          <Card className="p-4 space-y-3">
            <div className="h-4 w-40 rounded bg-[var(--color-bg-hover)]" />
            <div className="h-40 w-full rounded bg-[var(--color-bg-hover)]" />
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="h-4 w-40 rounded bg-[var(--color-bg-hover)]" />
                <div className="h-24 w-full rounded bg-[var(--color-bg-hover)]" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {header}
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md w-full text-center">
            <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Failed to load ROI data</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw size={14} />
              Retry
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {header}
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md w-full text-center">
            <PiggyBank size={40} className="mx-auto text-[var(--color-text-muted)] mb-3" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Not enough data yet</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              ROI dashboard updates once you have 30+ days of platform usage.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  const TrendIcon = trendDirection === 'up' ? TrendingUp
    : trendDirection === 'down' ? TrendingDown : Minus
  const trendColor = trendDirection === 'up' ? 'text-emerald-400'
    : trendDirection === 'down' ? 'text-red-400' : 'text-zinc-400'
  const trendLabel = trendDirection === 'up' ? 'Improving'
    : trendDirection === 'down' ? 'Declining' : 'Stable'

  const barData = data.compliance_rate_trend.map(d => ({
    label: formatWeekLabel(d.week),
    value: d.rate,
  }))

  const totalHours = data.avoided_downtime_hours + data.time_saved_ptw

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {header}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4">
        <SummaryCard
          label="Access Denials Prevented"
          value={data.access_denials_prevented}
          icon={Shield}
          color="text-emerald-400"
        />
        <SummaryCard
          label="Compliance Rate"
          value={`${data.compliance_rate}%`}
          icon={TrendIcon}
          color={trendColor}
          subtitle={trendLabel}
        />
        <SummaryCard
          label="Downtime Avoided"
          value={`${data.avoided_downtime_hours}h`}
          icon={Clock}
          color="text-blue-400"
          subtitle={formatZAR(data.avoided_downtime_cost)}
        />
        <SummaryCard
          label="ROI Ratio"
          value={data.roi_ratio.toFixed(2)}
          icon={Wallet}
          color="text-amber-400"
          subtitle={`R${data.roi_ratio.toFixed(2)} saved per R1 spent`}
        />
      </div>

      <div className="px-6 pb-4">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Compliance Rate Trend</h2>
          {barData.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <BarChart
                data={barData}
                width={Math.max(300, barData.length * 40)}
                height={180}
                formatValue={(v) => `${v}%`}
              />
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No trend data available for this period.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6 pb-6">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Savings Breakdown</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-glass-border)]">
                <th className="text-left py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide font-medium">Category</th>
                <th className="text-right py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide font-medium">Hours</th>
                <th className="text-right py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--color-glass-border)]">
                <td className="py-2.5 text-sm text-[var(--color-text-primary)]">Access Denials Prevented</td>
                <td className="py-2.5 text-right text-sm text-[var(--color-text-muted)]">—</td>
                <td className="py-2.5 text-right text-sm text-[var(--color-text-primary)] tabular-nums">{formatZAR(data.avoided_downtime_cost)}</td>
              </tr>
              <tr className="border-b border-[var(--color-glass-border)]">
                <td className="py-2.5 text-sm text-[var(--color-text-primary)]">PTW Processing Time Saved</td>
                <td className="py-2.5 text-right text-sm text-[var(--color-text-primary)] tabular-nums">{data.time_saved_ptw}h</td>
                <td className="py-2.5 text-right text-sm text-[var(--color-text-muted)]">—</td>
              </tr>
              <tr>
                <td className="py-2.5 text-sm font-semibold text-[var(--color-text-primary)]">Total Potential Savings</td>
                <td className="py-2.5 text-right text-sm font-semibold text-[var(--color-text-primary)] tabular-nums">{totalHours}h</td>
                <td className="py-2.5 text-right text-sm font-semibold text-emerald-400 tabular-nums">{formatZAR(data.total_potential_savings)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Wallet size={16} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Platform Cost</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Subscription Cost</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">{formatZAR(data.platform_cost)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Total Savings</p>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatZAR(data.total_potential_savings)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--color-glass-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--color-text-muted)]">Net return</span>
              <span className="text-base font-bold text-emerald-400 tabular-nums">
                {formatZAR(data.total_potential_savings - data.platform_cost)}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(100, (data.total_potential_savings / Math.max(data.platform_cost, 1)) * 50)}%` }}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

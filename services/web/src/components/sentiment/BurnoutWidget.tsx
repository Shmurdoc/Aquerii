import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { AlertTriangle, TrendingUp, Users, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

interface BurnoutScore {
  id: string
  user_id: string
  score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  factors: Record<string, number>
  recommendations: string | null
  user?: { id: string; name: string }
  calculated_at: string
}

interface TeamOverview {
  data: BurnoutScore[]
  summary: {
    total_members: number
    critical: number
    high: number
    medium: number
    low: number
    avg_score: number
  }
}

const RISK_COLORS = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const RISK_BAR_COLORS = {
  low: 'bg-emerald-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

export function BurnoutWidget() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id ?? ''

  const { data, isLoading, refetch } = useQuery<TeamOverview>({
    queryKey: ['sentiment', 'team', wid],
    queryFn: () => api.get(`/workspaces/${wid}/sentiment/team`).then(r => r.data),
    enabled: !!wid,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] p-4">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm">
          <RefreshCw size={14} className="animate-spin" />
          Loading team sentiment…
        </div>
      </div>
    )
  }

  if (!data) return null

  const { summary, data: scores } = data
  const atRiskCount = summary.critical + summary.high

  return (
    <div className="rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Team Sentiment</h3>
        <button
          onClick={() => refetch()}
          className="p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] transition-colors"
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2">
        <SummaryCard label="Avg Score" value={`${summary.avg_score.toFixed(0)}`} icon={<TrendingUp size={12} />} />
        <SummaryCard label="At Risk" value={`${atRiskCount}`} icon={<AlertTriangle size={12} />} danger={atRiskCount > 0} />
        <SummaryCard label="Total" value={`${summary.total_members}`} icon={<Users size={12} />} />
        <SummaryCard label="Low Risk" value={`${summary.low}`} icon={<Users size={12} />} />
      </div>

      {/* Risk distribution bar */}
      <div className="space-y-1">
        <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-bg-hover)]">
          {summary.total_members > 0 && (
            <>
              {summary.critical > 0 && (
                <div
                  className={RISK_BAR_COLORS.critical}
                  style={{ width: `${(summary.critical / summary.total_members) * 100}%` }}
                />
              )}
              {summary.high > 0 && (
                <div
                  className={RISK_BAR_COLORS.high}
                  style={{ width: `${(summary.high / summary.total_members) * 100}%` }}
                />
              )}
              {summary.medium > 0 && (
                <div
                  className={RISK_BAR_COLORS.medium}
                  style={{ width: `${(summary.medium / summary.total_members) * 100}%` }}
                />
              )}
              {summary.low > 0 && (
                <div
                  className={RISK_BAR_COLORS.low}
                  style={{ width: `${(summary.low / summary.total_members) * 100}%` }}
                />
              )}
            </>
          )}
        </div>
        <div className="flex justify-between text-[9px] text-[var(--color-text-muted)]">
          <span>Critical ({summary.critical})</span>
          <span>High ({summary.high})</span>
          <span>Medium ({summary.medium})</span>
          <span>Low ({summary.low})</span>
        </div>
      </div>

      {/* Individual scores */}
      {scores.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">Individual Scores</p>
          {scores.slice(0, 10).map(score => (
            <ScoreRow key={score.id} score={score} />
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  danger = false,
}: {
  label: string
  value: string
  icon: React.ReactNode
  danger?: boolean
}) {
  return (
    <div className={clsx(
      'rounded-lg p-2 text-center',
      danger ? 'bg-red-500/10' : 'bg-[var(--color-bg-hover)]',
    )}>
      <div className={clsx('text-lg font-bold', danger ? 'text-red-400' : 'text-[var(--color-text-primary)]')}>
        {value}
      </div>
      <div className="text-[9px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">
        {icon} {label}
      </div>
    </div>
  )
}

function ScoreRow({ score }: { score: BurnoutScore }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent-text)] text-[10px] font-bold shrink-0">
        {score.user?.name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-primary)] truncate">{score.user?.name ?? 'Unknown'}</span>
          <span className={clsx(
            'text-[10px] px-1.5 py-0.5 rounded font-medium border',
            RISK_COLORS[score.risk_level],
          )}>
            {score.risk_level}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-bg-hover)]">
            <div
              className={clsx('h-full rounded-full transition-all', RISK_BAR_COLORS[score.risk_level])}
              style={{ width: `${score.score}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{score.score.toFixed(0)}</span>
        </div>
      </div>
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'

interface KpiCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'info'
  loading?: boolean
  onClick?: () => void
}

const COLOR_MAP: Record<string, { circle: string; icon: string }> = {
  accent:  { circle: 'bg-accent-light', icon: 'text-accent-text' },
  success: { circle: 'bg-emerald-500/15', icon: 'text-emerald-400' },
  warning: { circle: 'bg-yellow-500/15', icon: 'text-yellow-400' },
  danger:  { circle: 'bg-red-500/15', icon: 'text-red-400' },
  info:    { circle: 'bg-blue-500/15', icon: 'text-blue-400' },
}

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
}

const TREND_COLOR = {
  up: 'text-emerald-400 bg-emerald-500/15',
  down: 'text-red-400 bg-red-500/15',
  neutral: 'text-gray-400 bg-gray-500/15',
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'accent',
  loading = false,
  onClick,
}: KpiCardProps) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.accent
  const TrendIcon = trend ? TREND_ICON[trend] : null

  const content = (
    <div
      className={clsx(
        'rounded-xl border p-4 flex items-start gap-4 transition-all',
        onClick && 'cursor-pointer hover:border-indigo-500/40',
      )}
      style={{
        background: 'var(--color-glass-bg)',
        borderColor: 'var(--color-glass-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className={clsx('rounded-xl p-3 shrink-0', colors.circle)}>
        <Icon size={20} className={colors.icon} />
      </div>

      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 bg-gray-800/50 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-800/50 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p
              className="text-2xl font-bold tracking-tight truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {value === '' || value === null || value === undefined ? '--' : value}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p
                className="text-xs truncate"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {title}
              </p>
              {trend && TrendIcon && (
                <span
                  className={clsx(
                    'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded shrink-0',
                    TREND_COLOR[trend],
                  )}
                >
                  <TrendIcon size={10} />
                  {trendValue ?? ''}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (onClick) {
    return <button type="button" onClick={onClick} className="w-full text-left block">{content}</button>
  }

  return content
}

import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'
import { Sparkline } from '@/components/ui/Sparkline'
import { useCountUp, useReducedMotion, staggerStyle } from '@/lib/motion'

interface KpiCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'info'
  loading?: boolean
  onClick?: () => void
  sparkline?: number[]
  sparklineColor?: string
  hint?: string
  index?: number
}

const COLOR_MAP: Record<string, { circle: string; icon: string; bar: string }> = {
  accent:  {
    circle: 'bg-[var(--color-accent-light)]',
    icon: 'text-[var(--color-accent-text)]',
    bar: 'var(--color-accent-text)',
  },
  success: {
    circle: 'bg-[var(--color-status-done)]/15',
    icon: 'text-[var(--color-status-done)]',
    bar: 'var(--color-status-done)',
  },
  warning: {
    circle: 'bg-[var(--color-status-progress)]/15',
    icon: 'text-[var(--color-status-progress)]',
    bar: 'var(--color-status-progress)',
  },
  danger:  {
    circle: 'bg-[var(--color-status-blocked)]/15',
    icon: 'text-[var(--color-status-blocked)]',
    bar: 'var(--color-status-blocked)',
  },
  info:    {
    circle: 'bg-[var(--color-status-review)]/15',
    icon: 'text-[var(--color-status-review)]',
    bar: 'var(--color-status-review)',
  },
}

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
}

const TREND_COLOR = {
  up: 'text-[var(--color-status-done)] bg-[var(--color-status-done)]/15',
  down: 'text-[var(--color-status-blocked)] bg-[var(--color-status-blocked)]/15',
  neutral: 'text-[var(--color-text-muted)] bg-[var(--color-bg-hover)]',
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
  sparkline,
  sparklineColor,
  hint,
  index = 0,
}: KpiCardProps) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.accent
  const TrendIcon = trend ? TREND_ICON[trend] : null
  const reduced = useReducedMotion()

  const numericValue = typeof value === 'number' && !Number.isNaN(value) ? value : 0
  const isNumeric = typeof value === 'number' && !Number.isNaN(value)
  const count = useCountUp({ to: numericValue, durationMs: reduced ? 0 : 900 })
  const display = !isNumeric
    ? (value === '' || value === null || value === undefined ? '—' : String(value))
    : count

  const content = (
    <div
      className={clsx(
        'group relative rounded-md p-4 flex items-start gap-4 overflow-hidden min-h-[112px]',
        'border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)]',
        'backdrop-blur-md transition-[background,border-color,box-shadow,transform] duration-200 ease-out',
        onClick && 'cursor-pointer hover:border-[var(--color-glass-border-hover)] hover:bg-[var(--color-glass-bg-strong)] hover:shadow-[var(--shadow-md)] active:scale-[0.998]',
      )}
    >
      <div className={clsx('rounded-md p-2.5 shrink-0', colors.circle)}>
        <Icon size={20} className={colors.icon} aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 bg-[var(--color-bg-hover)] rounded animate-pulse" />
            <div className="h-3 w-24 bg-[var(--color-bg-hover)] rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p
              className={clsx(
                'text-display-sm font-bold tracking-tight tabular-nums truncate',
                'text-[var(--color-text-primary)]',
                !reduced && 'animate-count-up',
              )}
              title={String(value)}
            >
              {display}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-body-sm text-[var(--color-text-muted)] truncate">
                {title}
              </p>
              {trend && TrendIcon && (
                <span
                  className={clsx(
                    'inline-flex items-center gap-0.5 text-label font-medium px-1.5 py-0.5 rounded shrink-0',
                    TREND_COLOR[trend],
                  )}
                >
                  <TrendIcon size={10} aria-hidden="true" />
                  {trendValue ?? ''}
                </span>
              )}
            </div>
            {hint && (
              <p className="text-micro text-[var(--color-text-muted)] mt-1 truncate">
                {hint}
              </p>
            )}
          </>
        )}
      </div>

      {sparkline && sparkline.length > 1 && (
        <div className="absolute right-3 bottom-2 opacity-90 group-hover:opacity-100 transition-opacity">
          <Sparkline
            data={sparkline}
            width={84}
            height={28}
            stroke={sparklineColor ?? colors.bar}
            fill={sparklineColor ?? colors.bar}
            ariaLabel={`${title} trend`}
          />
        </div>
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="stagger-item w-full text-left block focus:outline-none focus-visible:shadow-[var(--shadow-focus)] rounded-md"
        style={staggerStyle(index)}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="stagger-item" style={staggerStyle(index)}>
      {content}
    </div>
  )
}

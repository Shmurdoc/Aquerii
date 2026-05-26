import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  changePct?: number | null
  children?: React.ReactNode
  className?: string
}

export function DashboardWidget({
  title,
  value,
  subtitle,
  changePct,
  children,
  className = '',
}: Props) {
  const hasTrend = changePct !== null && changePct !== undefined
  const isUp   = hasTrend && changePct! > 0
  const isDown = hasTrend && changePct! < 0

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col gap-3 ${className}`}
      style={{
        background: 'var(--color-bg-surface)',
        borderColor: 'var(--color-glass-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {title}
        </p>
        {hasTrend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
              isUp
                ? 'bg-emerald-500/15 text-emerald-400'
                : isDown
                ? 'bg-red-500/15 text-red-400'
                : 'bg-gray-500/15 text-gray-400'
            }`}
          >
            {isUp ? (
              <TrendingUp size={11} />
            ) : isDown ? (
              <TrendingDown size={11} />
            ) : (
              <Minus size={11} />
            )}
            {Math.abs(changePct!).toFixed(1)}%
          </span>
        )}
      </div>

      <div>
        <p
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </div>
  )
}

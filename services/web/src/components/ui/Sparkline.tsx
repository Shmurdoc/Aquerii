import { useMemo, type CSSProperties } from 'react'
import { clsx } from 'clsx'

type SparklineProps = {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  className?: string
  showArea?: boolean
  ariaLabel?: string
}

export function Sparkline({
  data,
  width = 96,
  height = 32,
  stroke,
  fill,
  className,
  showArea = true,
  ariaLabel,
}: SparklineProps) {
  const { path, area, hasData } = useMemo(() => {
    if (data.length < 2) {
      return { path: '', area: '', hasData: false }
    }
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const stepX = width / (data.length - 1)

    const points = data.map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / range) * (height - 4) - 2
      return [x, y] as const
    })

    const pathStr = points
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ')

    const lastX = (points[points.length - 1]?.[0] ?? 0).toFixed(2)
    const firstX = (points[0]?.[0] ?? 0).toFixed(2)
    const areaStr = `${pathStr} L${lastX},${height} L${firstX},${height} Z`

    return { path: pathStr, area: areaStr, hasData: true }
  }, [data, width, height])

  if (!hasData) {
    return (
      <div
        className={clsx('text-micro text-[var(--color-text-muted)]', className)}
        style={{ width, height }}
        aria-label={ariaLabel}
      >
        —
      </div>
    )
  }

  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`
  const defaultStroke = stroke ?? 'var(--color-accent-text)'
  const defaultFill = fill ?? 'var(--color-accent)'

  const style: CSSProperties = { width, height }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={clsx('overflow-visible', className)}
      style={style}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={defaultFill} stopOpacity="0.32" />
          <stop offset="100%" stopColor={defaultFill} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <path d={area} fill={`url(#${gradId})`} />}
      <path
        d={path}
        fill="none"
        stroke={defaultStroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

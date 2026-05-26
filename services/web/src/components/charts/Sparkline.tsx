import React, { useMemo } from 'react'

interface DataPoint {
  value: number
}

interface Props {
  data: DataPoint[]
  width?: number
  height?: number
  color?: string
  filled?: boolean
  strokeWidth?: number
}

export function Sparkline({
  data,
  width = 120,
  height = 40,
  color = 'var(--color-accent)',
  filled = true,
  strokeWidth = 2,
}: Props) {
  const points = useMemo(() => {
    if (data.length < 2) return { path: '', area: '', dots: [] as { x: number; y: number }[] }

    const values = data.map((d) => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const pad = strokeWidth

    const coords = values.map((v, i) => ({
      x: pad + (i / (values.length - 1)) * (width - pad * 2),
      y: pad + (1 - (v - min) / range) * (height - pad * 2),
    }))

    const path = coords
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ')

    const area = `${path} L${coords[coords.length - 1].x.toFixed(1)},${(height - pad).toFixed(1)} L${coords[0].x.toFixed(1)},${(height - pad).toFixed(1)} Z`

    return { path, area, dots: coords }
  }, [data, width, height, strokeWidth])

  if (data.length < 2) return null

  // Use a stable id derived from dimensions to avoid hydration issues
  const id = `spark-${width}-${height}-${data.length}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
    >
      <defs>
        {filled && (
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        )}
      </defs>
      {filled && <path d={points.area} fill={`url(#${id})`} />}
      <path
        d={points.path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

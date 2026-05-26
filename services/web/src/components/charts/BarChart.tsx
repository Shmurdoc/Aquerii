import React from 'react'

interface Bar {
  label: string
  value: number
  color?: string
}

interface Props {
  data: Bar[]
  width?: number
  height?: number
  formatValue?: (v: number) => string
}

export function BarChart({
  data,
  width = 300,
  height = 160,
  formatValue = String,
}: Props) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const padL = 8, padR = 8, padT = 8, padB = 28
  const chartW = width - padL - padR
  const chartH = height - padT - padB
  const barW = Math.max(8, (chartW / data.length) * 0.55)
  const gap = chartW / data.length

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((bar, i) => {
        const barH = (bar.value / max) * chartH
        const x = padL + i * gap + gap / 2 - barW / 2
        const y = padT + chartH - barH

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill={bar.color ?? 'var(--color-accent)'}
              opacity={0.85}
            />
            <text
              x={x + barW / 2}
              y={padT + chartH + 16}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-text-muted)"
            >
              {bar.label}
            </text>
            {bar.value > 0 && (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={9}
                fill="var(--color-text-secondary)"
              >
                {formatValue(bar.value)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

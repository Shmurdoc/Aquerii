import { useEffect, useRef, useState } from 'react'

interface Props {
  label: string
  used: number
  limit: number
  unit?: string
  color?: 'accent' | 'emerald' | 'amber' | 'rose'
}

const colorMap = {
  accent: 'bg-accent',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
}

const pctColor = (pct: number): 'emerald' | 'amber' | 'rose' =>
  pct > 90 ? 'rose' : pct > 70 ? 'amber' : 'emerald'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function UsageMeter({ label, used, limit, unit, color }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const isUnlimited = limit === -1 || limit === 9999 || limit === 99999 || limit === 999999
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)
  const effectiveColor = color ?? pctColor(pct)

  useEffect(() => {
    const timer = requestAnimationFrame(() => setWidth(pct))
    return () => cancelAnimationFrame(timer)
  }, [pct])

  const displayUsed = unit === 'bytes' ? formatBytes(used) : used.toLocaleString()
  const displayLimit = isUnlimited ? 'Unlimited' : unit === 'bytes' ? formatBytes(limit) : limit.toLocaleString()

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">
          {displayUsed}
          {!isUnlimited && <span className="text-gray-600"> / {displayLimit}</span>}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          ref={barRef}
          className={`h-full rounded-full transition-all duration-1000 ease-out ${colorMap[effectiveColor]}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

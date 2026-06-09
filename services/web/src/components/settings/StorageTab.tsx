import { useMemo } from 'react'
import { useStorage } from '@/hooks/useSettings'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { FileText, Image as ImageIcon, Download, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import type { StorageBreakdownItem } from '@/lib/settings'

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatActivity(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const barColor = (pct: number): string =>
  pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'

const rowAccent = (pct: number): string =>
  pct > 90 ? 'text-rose-400' : pct > 70 ? 'text-amber-400' : 'text-emerald-400'

function ProgressBar({ used, quota, percent }: { used: number; quota: number; percent: number }) {
  const isUnlimited = quota === -1 || quota === 0
  const safePct = isUnlimited ? 0 : Math.min(percent, 100)

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-300">
          <span className="text-2xl font-semibold text-gray-100 tabular-nums">{formatBytes(used)}</span>
          {!isUnlimited && (
            <span className="text-gray-500"> / {formatBytes(quota)}</span>
          )}
        </span>
        <span className={clsx('text-sm font-medium tabular-nums', rowAccent(safePct))}>
          {isUnlimited ? 'No quota' : `${safePct.toFixed(1)}% used`}
        </span>
      </div>
      <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700 ease-out', isUnlimited ? 'bg-gray-700' : barColor(safePct))}
          style={{ width: `${safePct}%` }}
        />
      </div>
    </div>
  )
}

interface BreakdownRowProps {
  icon: React.ReactNode
  label: string
  item: StorageBreakdownItem
}

function BreakdownRow({ icon, label, item }: BreakdownRowProps) {
  return (
    <tr className="border-b border-gray-800/50 last:border-b-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2 text-gray-200">
          <span className="text-gray-400">{icon}</span>
          <span className="text-sm">{label}</span>
        </div>
      </td>
      <td className="py-3 pr-4 text-right text-sm text-gray-300 tabular-nums">{item.count.toLocaleString()}</td>
      <td className="py-3 pr-4 text-right text-sm text-gray-300 tabular-nums">{formatBytes(item.bytes)}</td>
      <td className="py-3 text-right text-xs text-gray-500 whitespace-nowrap">
        <span className="inline-flex items-center gap-1">
          <Clock size={11} className="text-gray-600" />
          {formatActivity(item.last_activity)}
        </span>
      </td>
    </tr>
  )
}

function StorageSkeleton() {
  return (
    <div className="max-w-3xl space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export default function StorageTab() {
  const { data, isLoading, isError } = useStorage()

  const isEmpty = useMemo(() => {
    if (!data) return false
    return (
      data.used_bytes === 0 &&
      data.breakdown.files.count === 0 &&
      data.breakdown.avatars.count === 0 &&
      data.breakdown.exports.count === 0
    )
  }, [data])

  if (isLoading) return <StorageSkeleton />

  if (isError || !data) {
    return (
      <div className="max-w-3xl">
        <Card variant="glass" padding="md">
          <p className="text-sm text-gray-400">Unable to load storage usage. Please try again later.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Storage</h2>
        <p className="text-xs text-gray-500 mt-1">
          Track how much space your workspace is using across files, avatars, and exports.
        </p>
      </div>

      <Card variant="glass" padding="md">
        <ProgressBar used={data.used_bytes} quota={data.quota_bytes} percent={data.percent_used} />
      </Card>

      <Card variant="glass" padding="md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-200">Breakdown</h3>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">By source</span>
        </div>
        {isEmpty ? (
          <p className="text-xs text-gray-500 py-6 text-center">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-800">
                  <th className="text-left font-semibold py-2 pr-4">Source</th>
                  <th className="text-right font-semibold py-2 pr-4">Count</th>
                  <th className="text-right font-semibold py-2 pr-4">Size</th>
                  <th className="text-right font-semibold py-2">Last activity</th>
                </tr>
              </thead>
              <tbody>
                <BreakdownRow icon={<FileText size={13} />}    label="Files"   item={data.breakdown.files} />
                <BreakdownRow icon={<ImageIcon size={13} />}  label="Avatars" item={data.breakdown.avatars} />
                <BreakdownRow icon={<Download size={13} />}   label="Exports" item={data.breakdown.exports} />
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

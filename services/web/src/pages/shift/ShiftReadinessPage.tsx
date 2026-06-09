import { useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useShiftReadiness, usePublishPlan, useCompletePlan, type ShiftRole } from '@/lib/shift-readiness'
import { Card, Button, Badge } from '@/components/ui'
import {
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import clsx from 'clsx'

function todayStr(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function shiftLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function dateNav(d: string, offset: number): string {
  const dt = new Date(d + 'T12:00:00')
  dt.setDate(dt.getDate() + offset)
  return dt.toISOString().slice(0, 10)
}

function formatDate(d: string): string {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const SHIFTS = ['morning', 'night', 'backshift'] as const

export default function ShiftReadinessPage() {
  const workspace = useAuthStore((s) => s.workspace)
  const [date, setDate] = useState(todayStr())
  const [shift, setShift] = useState<string>('morning')
  const initializedRef = useRef(false)

  const { data: readiness, isLoading, isError, error, refetch } = useShiftReadiness(
    workspace?.id ?? '',
    date,
    shift,
  )
  const publishPlan = usePublishPlan()
  const completePlan = useCompletePlan()

  const handlePublish = useCallback(() => {
    publishPlan.mutate(`${date}-${shift}`)
  }, [publishPlan, date, shift])

  const handleComplete = useCallback(() => {
    completePlan.mutate(`${date}-${shift}`)
  }, [completePlan, date, shift])

  if (initializedRef.current === false) {
    initializedRef.current = true
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Users size={20} className="text-emerald-400" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Workforce Readiness</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(todayStr())}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] px-2 py-1 rounded transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setDate((d) => dateNav(d, -1))}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setDate((d) => dateNav(d, 1))}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            <ChevronRight size={16} />
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)]">
            <Calendar size={14} className="text-[var(--color-text-muted)]" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-[var(--color-text-primary)] text-xs border-0 outline-none w-[110px]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-6 py-3 border-b border-[var(--color-glass-border)]">
        {SHIFTS.map((s) => (
          <button
            key={s}
            onClick={() => setShift(s)}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              shift === s
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] hover:border-[var(--color-glass-border-hover)]',
            )}
          >
            {shiftLabel(s)}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">{formatDate(date)}</span>
      </div>

      <div className="flex-1 space-y-4 px-6 py-4">
        {isLoading && <LoadingSkeleton />}

        {isError && !isLoading && (
          <ErrorState message={(error as Error)?.message ?? 'Failed to load shift readiness'} onRetry={() => refetch()} />
        )}

        {!isLoading && !isError && !readiness && (
          <EmptyState date={date} shift={shift} />
        )}

        {readiness && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ReadinessGauge pct={readiness.overall_readiness} />
              <div className="lg:col-span-2 space-y-4">
                {readiness.critical_gaps.length > 0 && (
                  <CriticalGapsAlert gaps={readiness.critical_gaps} />
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="gradient" onClick={handlePublish} loading={publishPlan.isPending}>
                    Publish Plan
                  </Button>
                  <Button size="sm" variant="success" onClick={handleComplete} loading={completePlan.isPending}>
                    Mark Complete
                  </Button>
                </div>
              </div>
            </div>

            <RoleTable roles={readiness.roles} />
          </>
        )}
      </div>
    </div>
  )
}

function ReadinessGauge({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? 'text-emerald-400' :
    pct >= 50 ? 'text-amber-400' :
    'text-red-400'

  const strokeColor =
    pct >= 80 ? '#34d399' :
    pct >= 50 ? '#fbbf24' :
    '#f87171'

  const radius = 56
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <Card className="p-4 flex flex-col items-center justify-center">
      <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Readiness</span>
      <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--color-bg-hover)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={clsx('text-3xl font-bold mt-2 tabular-nums', color)}>
        {Math.round(pct)}%
      </span>
    </Card>
  )
}

function CriticalGapsAlert({ gaps }: { gaps: { role: string; gap: number }[] }) {
  const items = gaps.map((g) => `${g.gap} ${g.role.toLowerCase()}${g.gap > 1 ? 's' : ''}`)
  return (
    <Card className="p-4 border-red-500/30 bg-red-500/5 flex items-start gap-3">
      <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-400">Critical Gaps</p>
        <p className="text-sm text-[var(--color-text-primary)] mt-0.5">
          Missing: {items.join(', ')}
        </p>
      </div>
    </Card>
  )
}

function RoleTable({ roles }: { roles: ShiftRole[] }) {
  if (roles.length === 0) {
    return (
      <Card className="p-6 text-center text-[var(--color-text-muted)] text-sm">
        No roles configured for this shift.
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-glass-border)]">
              <Th>Role</Th>
              <Th>Required</Th>
              <Th>Assigned</Th>
              <Th>Checked In</Th>
              <Th>Compliant</Th>
              <Th>Gap</Th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r, i) => (
              <tr
                key={r.role}
                className={clsx(
                  'border-b border-[var(--color-glass-border)] last:border-0',
                  i % 2 === 0 ? 'bg-[var(--color-bg-surface)]' : 'bg-transparent',
                )}
              >
                <Td className="font-medium text-[var(--color-text-primary)]">{r.role}</Td>
                <Td>{r.required}</Td>
                <Td>{r.assigned}</Td>
                <Td>{r.checked_in}</Td>
                <Td>{r.compliant}</Td>
                <Td>
                  <span className="tabular-nums">
                    {r.gaps > 0 ? (
                      <span className="text-red-400 font-medium">{r.gaps}</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">0</span>
                    )}
                  </span>
                  <span className="ml-1.5">
                    {r.gaps > 0 ? (
                      <XCircle size={14} className="inline text-red-400" />
                    ) : (
                      <CheckCircle2 size={14} className="inline text-emerald-400" />
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={clsx('px-4 py-3 text-[var(--color-text-secondary)] tabular-nums', className)}>
      {children}
    </td>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 flex flex-col items-center gap-3">
          <div className="w-[140px] h-[140px] rounded-full bg-gray-800/50" />
          <div className="h-8 w-20 rounded bg-gray-800/50" />
        </Card>
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <div className="h-5 w-48 rounded bg-gray-800/50" />
          </Card>
          <div className="flex gap-2">
            <div className="h-8 w-28 rounded-md bg-gray-800/50" />
            <div className="h-8 w-32 rounded-md bg-gray-800/50" />
          </div>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 rounded bg-gray-800/50" />
          ))}
        </div>
      </Card>
    </div>
  )
}

function EmptyState({ date: _, shift: __ }: { date: string; shift: string }) {
  return (
    <Card className="p-8 text-center">
      <Users size={32} className="mx-auto text-[var(--color-text-muted)] mb-2" />
      <p className="text-[var(--color-text-muted)]">No shift plan for this date. Create one?</p>
      <Button size="sm" variant="primary" className="mt-3">
        Create Plan
      </Button>
    </Card>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-8 text-center border-red-500/30">
      <XCircle size={32} className="mx-auto text-red-400 mb-2" />
      <p className="text-sm text-red-400 font-medium mb-1">Failed to load</p>
      <p className="text-xs text-[var(--color-text-muted)] mb-3">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </Card>
  )
}

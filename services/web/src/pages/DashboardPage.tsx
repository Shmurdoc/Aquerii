import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { api } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { MyTasksWidget } from '@/components/dashboard/MyTasksWidget'
import { ActivityFeed, type Activity } from '@/components/dashboard/ActivityFeed'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { BurnoutWidget } from '@/components/sentiment/BurnoutWidget'
import {
  CheckSquare,
  AlertCircle,
  Video,
  Bell,
  Clock,
  UserPlus,
  FileEdit,
  MessageSquare,
  LayoutGrid,
  type LucideIcon,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { staggerStyle } from '@/lib/motion'

interface DashboardMetrics {
  open_items: number
  overdue_items: number
  upcoming_meetings: number
}

const defaultMetrics: DashboardMetrics = {
  open_items: 0,
  overdue_items: 0,
  upcoming_meetings: 0,
}

function WidgetErrorFallback({ label }: { label: string }) {
  return (
    <div
      className="rounded-md border border-[var(--color-glass-border)] p-4 flex items-center justify-center min-h-[120px] bg-[var(--color-glass-bg)]"
    >
      <p className="text-label text-[var(--color-text-muted)]">Failed to load {label}</p>
    </div>
  )
}

function timeAwareGreeting(date: Date, firstName: string): string {
  const h = date.getHours()
  if (h < 5)  return `Still up, ${firstName}?`
  if (h < 12) return `Good morning, ${firstName}`
  if (h < 17) return `Good afternoon, ${firstName}`
  if (h < 22) return `Good evening, ${firstName}`
  return `Late night, ${firstName}`
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function DashboardHero() {
  const user = useAuthStore(s => s.user)
  const workspace = useAuthStore(s => s.workspace)
  const navigate = useNavigate()
  const now = new Date()
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const greeting = timeAwareGreeting(now, firstName)
  const longDate = formatLongDate(now)

  const hour = now.getHours()
  const motivation =
    hour < 9  ? 'A clean slate. Set the tone for the day.' :
    hour < 13 ? 'Momentum is built in the morning. Knock out the hardest task first.' :
    hour < 18 ? 'Stay sharp — keep the second half of the day as deliberate as the first.' :
                'Wrap the day well. Anything left gets a clear tomorrow.'

  return (
    <div
      className="relative overflow-hidden rounded-md p-6 sm:p-7 border border-[var(--color-glass-border)]"
      style={{
        background:
          'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(168,85,247,0.10) 45%, rgba(236,72,153,0.10) 100%)',
        boxShadow: 'var(--shadow-elevated)',
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 ambient-mesh opacity-80" />
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[var(--color-accent)]/30 blur-3xl animate-orb-drift-slow"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 right-1/3 w-72 h-72 rounded-full bg-[var(--row-9)]/25 blur-3xl animate-orb-drift"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p
            className="text-micro font-semibold uppercase tracking-widest text-[var(--color-accent-text)] flex items-center gap-1.5"
            style={staggerStyle(0)}
          >
            <Sparkles size={11} aria-hidden="true" />
            {longDate}
          </p>
          <h1
            className="text-display-md sm:text-display-lg font-bold tracking-tight mt-1 gradient-text"
            style={staggerStyle(1)}
          >
            {greeting}
          </h1>
          <p
            className="text-body text-[var(--color-text-secondary)] mt-2 max-w-lg"
            style={staggerStyle(2)}
          >
            {motivation}
          </p>
          {workspace && (
            <p
              className="text-label text-[var(--color-text-muted)] mt-3 flex items-center gap-2"
              style={staggerStyle(3)}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-done)] status-dot-pulse"
                aria-hidden="true"
              />
              {workspace.name}
            </p>
          )}
        </div>

        <div
          className="flex items-center gap-2 shrink-0"
          style={staggerStyle(4)}
        >
          <button
            onClick={() => navigate('/boards')}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-white text-body-sm font-medium shadow-[var(--shadow-md)] press-shrink hover:shadow-[var(--shadow-elevated)] focus:outline-none focus-visible:shadow-[var(--shadow-focus)] transition-shadow duration-200"
            style={{ background: 'var(--gradient-accent)' }}
          >
            Open boards
            <ArrowRight size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate('/my-day')}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-body-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)] hover:border-[var(--color-glass-border-hover)] press-shrink transition-colors duration-150"
          >
            Plan my day
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiRow() {
  const workspace = useAuthStore(s => s.workspace)
  const unreadCount = useNotificationStore(s => s.unreadCount)

  const { data: metrics = defaultMetrics, isLoading } = useQuery({
    queryKey: ['dashboard', 'metrics', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/reports/dashboard`, {
        params: { period: '30' },
      })
      const d = res.data
      return {
        open_items: d.open_items ?? 0,
        overdue_items: d.overdue_count ?? 0,
        upcoming_meetings: d.upcoming_meetings ?? 0,
      } as DashboardMetrics
    },
    enabled: !!workspace,
    staleTime: 60_000,
  })

  const kpis = useMemo(() => [
    {
      title: 'Open Tasks',
      value: metrics.open_items,
      icon: CheckSquare,
      color: 'accent' as const,
      loading: isLoading,
      hint: 'Across all boards',
    },
    {
      title: 'Overdue',
      value: metrics.overdue_items,
      icon: AlertCircle,
      trend: metrics.overdue_items > 0 ? 'down' as const : 'neutral' as const,
      trendValue: metrics.overdue_items > 0 ? `${metrics.overdue_items} items` : 'On track',
      color: 'danger' as const,
      loading: isLoading,
      hint: 'Past due date',
    },
    {
      title: 'Upcoming Meetings',
      value: metrics.upcoming_meetings,
      icon: Video,
      color: 'info' as const,
      loading: isLoading,
      hint: 'Next 7 days',
    },
    {
      title: 'Unread',
      value: unreadCount,
      icon: Bell,
      trend: unreadCount > 0 ? 'neutral' as const : 'up' as const,
      trendValue: unreadCount > 0 ? `${unreadCount} new` : 'All clear',
      color: 'warning' as const,
      loading: isLoading,
      hint: 'Notifications',
    },
  ], [metrics, unreadCount, isLoading])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.title} index={i} {...kpi} />
      ))}
    </div>
  )
}

function ActivityFeedWrapper() {
  const workspace = useAuthStore(s => s.workspace)

  const { data: rawActivities = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'activity', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/activity`, {
        params: { limit: 20 },
      })
      return res.data.data ?? []
    },
    enabled: !!workspace,
    staleTime: 30_000,
  })

  const activities: Activity[] = useMemo(() =>
    rawActivities.map((a: any) => ({
      id: a.id ?? crypto.randomUUID(),
      icon: <ActivityIcon type={a.type ?? 'generic'} />,
      actor: a.actor?.name ?? a.actor ?? 'Someone',
      action: a.action ?? 'updated',
      target: a.target ?? 'an item',
      targetHref: a.target_href ?? undefined,
      timestamp: a.created_at ?? a.timestamp ?? new Date().toISOString(),
      read: !!a.read_at,
    })),
    [rawActivities],
  )

  return (
    <ActivityFeed
      items={activities}
      loading={isLoading}
      emptyMessage="No recent activity in this workspace"
      viewAllHref="/inbox"
    />
  )
}

function ActivityIcon({ type }: { type: string }) {
  const size = 14
  switch (type) {
    case 'user.created':
    case 'member_added':
      return <UserPlus size={size} />
    case 'item.created':
      return <LayoutGrid size={size} />
    case 'item.updated':
      return <FileEdit size={size} />
    case 'comment.created':
      return <MessageSquare size={size} />
    default:
      return <Clock size={size} />
  }
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-32 bg-[var(--color-bg-hover)] rounded" />
        <div className="h-9 w-72 bg-[var(--color-bg-hover)] rounded" />
        <div className="h-4 w-96 bg-[var(--color-bg-hover)] rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-[var(--color-bg-hover)] rounded-md" />
        ))}
      </div>
      <div className="h-64 bg-[var(--color-bg-hover)] rounded-md" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-80 bg-[var(--color-bg-hover)] rounded-md" />
        <div className="h-40 bg-[var(--color-bg-hover)] rounded-md" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-6 space-y-5 overflow-auto h-full">
      <div style={staggerStyle(0)} className="stagger-item">
        <DashboardHero />
      </div>

      <div style={staggerStyle(1)} className="stagger-item">
        <ErrorBoundary fallback={<WidgetErrorFallback label="metrics" />}>
          <KpiRow />
        </ErrorBoundary>
      </div>

      <div style={staggerStyle(2)} className="stagger-item">
        <ErrorBoundary fallback={<WidgetErrorFallback label="tasks" />}>
          <MyTasksWidget />
        </ErrorBoundary>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        style={staggerStyle(3)}
      >
        <div className="lg:col-span-2">
          <ErrorBoundary fallback={<WidgetErrorFallback label="activity feed" />}>
            <ActivityFeedWrapper />
          </ErrorBoundary>
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      <div style={staggerStyle(4)} className="stagger-item">
        <ErrorBoundary fallback={<WidgetErrorFallback label="team sentiment" />}>
          <BurnoutWidget />
        </ErrorBoundary>
      </div>
    </div>
  )
}

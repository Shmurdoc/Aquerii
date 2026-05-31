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
} from 'lucide-react'

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
      className="rounded-xl border p-4 flex items-center justify-center min-h-[120px]"
      style={{
        background: 'var(--color-glass-bg)',
        borderColor: 'var(--color-glass-border)',
      }}
    >
      <p className="text-xs text-gray-500">Failed to load {label}</p>
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

  const kpis: Array<{
    title: string
    value: string | number
    icon: LucideIcon
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    color: 'accent' | 'success' | 'warning' | 'danger' | 'info'
    loading: boolean
  }> = useMemo(() => [
    {
      title: 'Open Tasks',
      value: metrics.open_items,
      icon: CheckSquare,
      color: 'accent' as const,
      loading: isLoading,
    },
    {
      title: 'Overdue',
      value: metrics.overdue_items,
      icon: AlertCircle,
      trend: metrics.overdue_items > 0 ? 'down' as const : 'neutral' as const,
      trendValue: metrics.overdue_items > 0 ? `${metrics.overdue_items} items` : 'None',
      color: 'danger' as const,
      loading: isLoading,
    },
    {
      title: 'Upcoming Meetings',
      value: metrics.upcoming_meetings,
      icon: Video,
      color: 'info' as const,
      loading: isLoading,
    },
    {
      title: 'Unread Notifications',
      value: unreadCount,
      icon: Bell,
      trend: unreadCount > 0 ? 'neutral' as const : 'neutral' as const,
      trendValue: unreadCount > 0 ? `${unreadCount} new` : 'All clear',
      color: 'warning' as const,
      loading: isLoading,
    },
  ], [metrics, unreadCount, isLoading])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(kpi => (
        <KpiCard key={kpi.title} {...kpi} />
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
      <div className="space-y-1">
        <div className="h-6 w-64 bg-gray-800/50 rounded" />
        <div className="h-4 w-48 bg-gray-800/50 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-800/50 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-800/50 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-80 bg-gray-800/50 rounded-xl" />
        <div className="h-40 bg-gray-800/50 rounded-xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const workspace = useAuthStore(s => s.workspace)

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{
        background: 'linear-gradient(135deg, var(--color-accent) 0%, rgba(124, 58, 237, 0.3) 100%)',
      }}>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="relative z-10 animate-slide-up">
          <h1 className="text-2xl font-bold text-white mb-1">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-white/70 text-sm">
            Here&apos;s what&apos;s happening in {workspace?.name ?? 'your workspace'} today
          </p>
        </div>
        {/* Floating decorative elements */}
        <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-4 right-20 w-20 h-20 bg-white/5 rounded-full blur-xl" />
      </div>

      {/* KPI Cards with stagger animation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <ErrorBoundary fallback={<WidgetErrorFallback label="metrics" />}>
            <KpiRow />
          </ErrorBoundary>
        </div>
      </div>

      {/* My Tasks Widget */}
      <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <ErrorBoundary fallback={<WidgetErrorFallback label="tasks" />}>
          <MyTasksWidget />
        </ErrorBoundary>
      </div>

      {/* Activity Feed + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="lg:col-span-2">
          <ErrorBoundary fallback={<WidgetErrorFallback label="activity feed" />}>
            <ActivityFeedWrapper />
          </ErrorBoundary>
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Team Sentiment */}
      <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <ErrorBoundary fallback={<WidgetErrorFallback label="team sentiment" />}>
          <BurnoutWidget />
        </ErrorBoundary>
      </div>
    </div>
  )
}

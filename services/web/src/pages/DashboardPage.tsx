import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { DashboardWidget } from '@/components/dashboard/DashboardWidget'
import { Sparkline } from '@/components/charts/Sparkline'
import {
  BarChart3, TrendingUp, Target, Users, DollarSign, Activity,
  Settings, X, Package, ShoppingCart, GitFork,
} from 'lucide-react'

interface WidgetDef {
  id: string
  label: string
  icon: any
  size: 'full' | 'half' | 'third'
}

const ALL_WIDGETS: WidgetDef[] = [
  { id: 'revenue', label: 'Revenue', icon: TrendingUp, size: 'half' },
  { id: 'pipeline', label: 'Pipeline', icon: GitFork, size: 'third' },
  { id: 'win-rate', label: 'Win Rate', icon: Target, size: 'third' },
  { id: 'churn', label: 'Churn Risk', icon: Activity, size: 'third' },
  { id: 'top-deals', label: 'Top Deals', icon: DollarSign, size: 'half' },
  { id: 'contacts', label: 'Contacts', icon: Users, size: 'third' },
  { id: 'inventory', label: 'Inventory', icon: Package, size: 'third' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, size: 'third' },
  { id: 'overview', label: 'Overview', icon: BarChart3, size: 'full' },
]

function loadWidgets(): string[] {
  try {
    const saved = localStorage.getItem('dashboard-widgets')
    if (saved) {
      const ids = JSON.parse(saved)
      const valid = ids.filter((id: string) => ALL_WIDGETS.some(w => w.id === id))
      if (valid.length > 0) return valid
    }
  } catch {}
  return ALL_WIDGETS.map(w => w.id)
}

export default function DashboardPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(loadWidgets)
  const [showConfig, setShowConfig] = useState(false)

  useEffect(() => {
    localStorage.setItem('dashboard-widgets', JSON.stringify(enabledWidgets))
  }, [enabledWidgets])

  const { data: dashData } = useQuery<any>({
    queryKey: ['reports', 'dashboard', wid, '30'],
    queryFn: () => api.get(`/workspaces/${wid}/reports/dashboard`, { params: { period: '30' } }).then(r => r.data),
    enabled: !!wid,
    staleTime: 60_000,
  })

  const { data: revenueData } = useQuery<any>({
    queryKey: ['crm-reports', 'revenue', wid, '30'],
    queryFn: () => api.get(`/workspaces/${wid}/crm/reports/revenue`, { params: { period: '30' } }).then(r => r.data),
    enabled: !!wid && enabledWidgets.includes('revenue'),
    staleTime: 120_000,
  })

  const { data: funnelData } = useQuery<any>({
    queryKey: ['crm-analytics', 'funnel', wid],
    queryFn: () => api.get(`/workspaces/${wid}/crm/analytics/funnel`).then(r => r.data),
    enabled: !!wid && enabledWidgets.includes('pipeline'),
    staleTime: 300_000,
  })

  const { data: winlossData } = useQuery<any>({
    queryKey: ['crm-reports', 'win-loss', wid, '30'],
    queryFn: () => api.get(`/workspaces/${wid}/crm/reports/win-loss`, { params: { period: '30' } }).then(r => r.data),
    enabled: !!wid && enabledWidgets.includes('win-rate'),
    staleTime: 300_000,
  })

  const { data: churnData } = useQuery<any>({
    queryKey: ['crm-analytics', 'churn-risk', wid, '90'],
    queryFn: () => api.get(`/workspaces/${wid}/crm/analytics/churn-risk`, { params: { threshold_days: '90' } }).then(r => r.data),
    enabled: !!wid && enabledWidgets.includes('churn'),
    staleTime: 300_000,
  })

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

  const sparklineData = (dashData?.revenue_by_day ?? []).map((d: any) => ({
    value: typeof d.revenue === 'string' ? parseFloat(d.revenue) : (d.revenue ?? 0),
  }))

  const toggleWidget = (id: string) => {
    setEnabledWidgets(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const sortedWidgets = ALL_WIDGETS.filter(w => enabledWidgets.includes(w.id))

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Dashboard</h1>
        <button onClick={() => setShowConfig(v => !v)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">
          <Settings size={13} /> Configure widgets
        </button>
      </div>

      {showConfig && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 mb-3">Toggle dashboard widgets</p>
          <div className="flex flex-wrap gap-2">
            {ALL_WIDGETS.map(w => (
              <button
                key={w.id}
                onClick={() => toggleWidget(w.id)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  enabledWidgets.includes(w.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-300'
                }`}
              >
                <w.icon size={12} /> {w.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* full-width widgets */}
        {sortedWidgets.filter(w => w.size === 'full').map(w => (
          <WidgetContainer key={w.id} widget={w}>
            {renderWidget(w.id, { dashData, revenueData, funnelData, winlossData, churnData, fmtCurrency, sparklineData })}
          </WidgetContainer>
        ))}

        {/* half + third widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {sortedWidgets.filter(w => w.size !== 'full').map(w => (
            <div key={w.id} className={w.size === 'half' ? 'lg:col-span-2' : 'lg:col-span-1'}>
              <WidgetContainer widget={w}>
                {renderWidget(w.id, { dashData, revenueData, funnelData, winlossData, churnData, fmtCurrency, sparklineData })}
              </WidgetContainer>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WidgetContainer({ widget, children }: { widget: WidgetDef; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <widget.icon size={14} className="text-indigo-400" />
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{widget.label}</p>
      </div>
      {children}
    </div>
  )
}

function renderWidget(id: string, ctx: any) {
  const { dashData, revenueData, funnelData, winlossData, churnData, fmtCurrency, sparklineData } = ctx

  switch (id) {
    case 'revenue': {
      const d = revenueData?.data
      if (!d) return <p className="text-xs text-gray-600">No revenue data.</p>
      return (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-lg font-bold text-white">{fmtCurrency(d.total_revenue)}</p>
            <p className="text-[10px] text-gray-500">Total (30d)</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{d.won_deals}</p>
            <p className="text-[10px] text-gray-500">Won deals</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{d.lost_deals}</p>
            <p className="text-[10px] text-gray-500">Lost deals</p>
          </div>
        </div>
      )
    }

    case 'pipeline': {
      const f = funnelData?.data
      if (!f) return <p className="text-xs text-gray-600">No pipeline data.</p>
      const totalDeals = f.stages?.reduce((s: number, st: any) => s + st.deal_count, 0) ?? 0
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-lg font-bold text-white">{totalDeals}</p>
              <p className="text-[10px] text-gray-500">Active deals</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-400">{f.won}</p>
              <p className="text-[10px] text-gray-500">Won</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-400">{f.lost}</p>
              <p className="text-[10px] text-gray-500">Lost</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Conversion: {f.conversion_rate}%</p>
        </div>
      )
    }

    case 'win-rate': {
      const d = winlossData?.data
      if (!d) return <p className="text-xs text-gray-600">No data.</p>
      return (
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{d.win_rate}%</p>
          <p className="text-xs text-gray-500 mt-1">Win rate (30d)</p>
          <p className="text-[10px] text-gray-600 mt-2">{d.won_count} won · {d.lost_count} lost</p>
        </div>
      )
    }

    case 'churn': {
      const d = churnData?.data
      if (!d) return <p className="text-xs text-gray-600">No data.</p>
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-lg font-bold text-white">{d.total_customers}</p>
              <p className="text-[10px] text-gray-500">Customers</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-400">{d.at_risk_count}</p>
              <p className="text-[10px] text-gray-500">At risk</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, d.churn_rate)}%` }} />
          </div>
          <p className="text-[10px] text-gray-500">{d.churn_rate}% churn rate (90d threshold)</p>
        </div>
      )
    }

    case 'overview': {
      if (!dashData) return <p className="text-xs text-gray-600">Loading...</p>
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <DashboardWidget title="Revenue" value={fmtCurrency(dashData.revenue_this_period)} subtitle="30d" className="!bg-transparent !border-0 !p-0">
              {sparklineData.length >= 2 && <Sparkline data={sparklineData} width={120} height={30} color="#818cf8" />}
            </DashboardWidget>
            <DashboardWidget title="Outstanding" value={fmtCurrency(dashData.outstanding)} subtitle="AR balance" className="!bg-transparent !border-0 !p-0" />
            <DashboardWidget title="Overdue" value={dashData.overdue_count} subtitle="Invoices" className="!bg-transparent !border-0 !p-0" />
            <DashboardWidget title="Open Items" value={dashData.open_items} subtitle="Tasks" className="!bg-transparent !border-0 !p-0" />
          </div>
        </div>
      )
    }

    case 'top-deals': {
      if (!dashData?.top_customers?.length) return <p className="text-xs text-gray-600">No top customer data.</p>
      return (
        <div className="space-y-1">
          {dashData.top_customers.slice(0, 5).map((c: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-300 truncate">{c.customer_name}</span>
              <span className="text-gray-200 font-mono">{fmtCurrency(typeof c.revenue === 'string' ? parseFloat(c.revenue) : c.revenue)}</span>
            </div>
          ))}
        </div>
      )
    }

    case 'contacts':
      return <p className="text-xs text-gray-600">Contact summary will appear here once queried.</p>

    case 'inventory':
      return <p className="text-xs text-gray-600">Inventory snapshot will appear here.</p>

    case 'orders':
      return <p className="text-xs text-gray-600">Recent orders will appear here.</p>

    default:
      return <p className="text-xs text-gray-600">Widget not implemented.</p>
  }
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, CheckSquare, DollarSign, Download,
  BarChart3, ShoppingCart, Package, TrendingUp, Clock,
  Users, Target, Activity, GitFork, TrendingDown,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDate } from '@/lib/erp'
import { DashboardWidget } from '@/components/dashboard/DashboardWidget'
import { Sparkline } from '@/components/charts/Sparkline'
import { BarChart } from '@/components/charts/BarChart'
import { Button } from '@/components/ui'

interface RevenueDay {
  day: string; revenue: string | number
}
interface StatusBreakdown {
  status: string; count: number; total: string | number
}
interface TopCustomer {
  customer_name: string; revenue: string | number; invoice_count: number
}
interface ArAging {
  current: number; '31_60': number; '61_90': number; over_90: number
}
interface DashboardData {
  revenue_this_period: number; revenue_prev_period: number; revenue_change_pct: number | null
  outstanding: number; overdue_count: number; open_items: number
  revenue_by_day: RevenueDay[]; invoice_status_breakdown: StatusBreakdown[]
  top_customers: TopCustomer[]; ar_aging: ArAging
}

interface ExpenseSummary {
  total_count: number; total_amount: number; pending: number; approved: number
}
interface CategoryRow {
  category: string; count: number; amount: number
}
interface MonthRow {
  month: string; amount: number; orders?: number
}
interface ExpenseReport {
  summary: ExpenseSummary; by_category: CategoryRow[]; by_month: MonthRow[]
  expenses: any
}

interface ProcurementSummary {
  total_orders: number; total_value: number; pending: number; received: number
}
interface SupplierRow {
  supplier_name: string; count: number; total: number
}
interface ProcurementReport {
  summary: ProcurementSummary; by_supplier: SupplierRow[]; by_month: MonthRow[]
  orders: any
}

interface InventoryReport {
  total_products: number; total_stock: number; low_stock_items: number
  categories: number; by_category: { category: string | null; count: number }[]
  recent_products: { id: string; name: string; sku: string | null; unit_price: number; currency: string }[]
}

const PERIODS = [
  { label: '7d', value: '7' },
  { label: '30d', value: '30' },
  { label: '90d', value: '90' },
]

const STATUS_COLORS: Record<string, string> = {
  paid: '#34d399', sent: '#60a5fa', draft: '#6b7280',
  partial: '#fbbf24', overdue: '#f87171', cancelled: '#9ca3af',
  pending: '#fbbf24', approved: '#34d399', rejected: '#f87171',
  received: '#34d399', confirmed: '#60a5fa',
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'expenses', label: 'Expenses', icon: DollarSign },
  { key: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'pipeline', label: 'Pipeline', icon: GitFork },
  { key: 'revenue', label: 'Revenue', icon: TrendingUp },
  { key: 'winloss', label: 'Win/Loss', icon: Target },
  { key: 'leads', label: 'Lead Sources', icon: Users },
  { key: 'churn', label: 'Churn Risk', icon: TrendingDown },
  { key: 'clv', label: 'CLV', icon: Activity },
]

function todayStr(): string {
  const d = new Date(); return d.toISOString().slice(0, 10)
}
function monthStartStr(): string {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

async function downloadCSV(wid: string, type: string, from: string, to: string) {
  const token = localStorage.getItem('token')
  const res = await fetch(`/api/workspaces/${wid}/reports/export/${type}?from=${from}&to=${to}&format=csv`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${type}-${from}-${to}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState('30')
  const [crmPeriod, setCrmPeriod] = useState('60')
  const [expenseFrom, setExpenseFrom] = useState(monthStartStr())
  const [expenseTo, setExpenseTo] = useState(todayStr())
  const [procurementFrom, setProcurementFrom] = useState(monthStartStr())
  const [procurementTo, setProcurementTo] = useState(todayStr())
  const [churnThreshold, setChurnThreshold] = useState('90')

  const wid = useAuthStore((s) => s.workspace?.id ?? '')

  const { data: dashData, isLoading: dashLoading, isError: dashError } = useQuery<DashboardData>({
    queryKey: ['reports', 'dashboard', wid, period],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/reports/dashboard`, { params: { period } })
      return res.data
    },
    enabled: !!wid,
    staleTime: 60_000,
  })

  const { data: expenseData, isLoading: expLoading } = useQuery<ExpenseReport>({
    queryKey: ['reports', 'expenses', wid, expenseFrom, expenseTo],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/reports/expenses`, {
        params: { from: expenseFrom, to: expenseTo },
      })
      return res.data
    },
    enabled: !!wid,
    staleTime: 30_000,
  })

  const { data: procData, isLoading: procLoading } = useQuery<ProcurementReport>({
    queryKey: ['reports', 'procurement', wid, procurementFrom, procurementTo],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/reports/procurement`, {
        params: { from: procurementFrom, to: procurementTo },
      })
      return res.data
    },
    enabled: !!wid,
    staleTime: 30_000,
  })

  const { data: invData, isLoading: invLoading } = useQuery<InventoryReport>({
    queryKey: ['reports', 'inventory', wid],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/reports/inventory`)
      return res.data
    },
    enabled: !!wid,
    staleTime: 60_000,
  })

  const { data: pipelineData, isLoading: pipeLoading } = useQuery<any>({
    queryKey: ['crm-reports', 'pipeline-velocity', wid, crmPeriod],
    queryFn: async () => { const r = await api.get(`/workspaces/${wid}/crm/reports/pipeline-velocity`, { params: { days: crmPeriod } }); return r.data },
    enabled: !!wid && activeTab === 'pipeline',
    staleTime: 60_000,
  })

  const { data: revenueData, isLoading: revLoading } = useQuery<any>({
    queryKey: ['crm-reports', 'revenue', wid, crmPeriod],
    queryFn: async () => { const r = await api.get(`/workspaces/${wid}/crm/reports/revenue`, { params: { period: crmPeriod } }); return r.data },
    enabled: !!wid && activeTab === 'revenue',
    staleTime: 60_000,
  })

  const { data: winlossData, isLoading: wlLoading } = useQuery<any>({
    queryKey: ['crm-reports', 'win-loss', wid, crmPeriod],
    queryFn: async () => { const r = await api.get(`/workspaces/${wid}/crm/reports/win-loss`, { params: { period: crmPeriod } }); return r.data },
    enabled: !!wid && activeTab === 'winloss',
    staleTime: 60_000,
  })

  const { data: activitiesData, isLoading: actLoading } = useQuery<any>({
    queryKey: ['crm-reports', 'activities', wid, crmPeriod],
    queryFn: async () => { const r = await api.get(`/workspaces/${wid}/crm/reports/activities`, { params: { period: crmPeriod } }); return r.data },
    enabled: !!wid && activeTab === 'pipeline',
    staleTime: 60_000,
  })

  const { data: leadSourcesData, isLoading: lsLoading } = useQuery<any>({
    queryKey: ['crm-reports', 'lead-sources', wid],
    queryFn: async () => { const r = await api.get(`/workspaces/${wid}/crm/reports/lead-sources`); return r.data },
    enabled: !!wid && activeTab === 'leads',
    staleTime: 120_000,
  })

  const { data: funnelData, isLoading: funnelLoading } = useQuery<any>({
    queryKey: ['crm-analytics', 'funnel', wid],
    queryFn: async () => { const r = await api.get(`/workspaces/${wid}/crm/analytics/funnel`); return r.data },
    enabled: !!wid && activeTab === 'pipeline',
    staleTime: 120_000,
  })

  const { data: churnData, isLoading: churnLoading } = useQuery<any>({
    queryKey: ['crm-analytics', 'churn-risk', wid, churnThreshold],
    queryFn: async () => { const r = await api.get(`/workspaces/${wid}/crm/analytics/churn-risk`, { params: { threshold_days: churnThreshold } }); return r.data },
    enabled: !!wid && activeTab === 'churn',
    staleTime: 120_000,
  })

  const { data: clvData, isLoading: clvLoading } = useQuery<any>({
    queryKey: ['crm-analytics', 'clv', wid],
    queryFn: async () => { const r = await api.get(`/workspaces/${wid}/crm/analytics/clv`); return r.data },
    enabled: !!wid && activeTab === 'clv',
    staleTime: 300_000,
  })

  const { data: cohortData } = useQuery<any>({
    queryKey: ['crm-analytics', 'cohort', wid],
    queryFn: async () => { const r = await api.get(`/workspaces/${wid}/crm/analytics/cohort`); return r.data },
    enabled: !!wid && activeTab === 'clv',
    staleTime: 300_000,
  })

  const sparklineData = (dashData?.revenue_by_day ?? []).map((d) => ({
    value: typeof d.revenue === 'string' ? parseFloat(d.revenue) : d.revenue,
  }))

  const agingBars = dashData
    ? [
        { label: 'Current', value: dashData.ar_aging.current, color: '#34d399' },
        { label: '31-60d', value: dashData.ar_aging['31_60'], color: '#fbbf24' },
        { label: '61-90d', value: dashData.ar_aging['61_90'], color: '#fb923c' },
        { label: '90d+', value: dashData.ar_aging.over_90, color: '#f87171' },
      ]
    : []

  function fmtCurrency(n: number) { return formatCurrency(n, 'USD') }

  function renderOverview() {
    if (dashLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading reports...</div>
    if (dashError || !dashData) return <div className="flex items-center justify-center h-full gap-2 text-sm" style={{ color: 'var(--color-status-blocked)' }}><AlertTriangle size={15} /> Failed to load report data.</div>

    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DashboardWidget title="Revenue" value={fmtCurrency(dashData.revenue_this_period)} subtitle={`Last ${period} days`} changePct={dashData.revenue_change_pct} className="col-span-2 lg:col-span-1">
            {sparklineData.length >= 2 && (
              <div className="flex justify-end pt-1">
                <Sparkline data={sparklineData} width={200} height={44} color="#818cf8" />
              </div>
            )}
          </DashboardWidget>
          <DashboardWidget title="Outstanding AR" value={fmtCurrency(dashData.outstanding)} subtitle="Unpaid sent invoices">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><DollarSign size={12} /> Total receivable balance</div>
          </DashboardWidget>
          <DashboardWidget title="Overdue Invoices" value={dashData.overdue_count} subtitle="Past due date">
            <div className={`flex items-center gap-1.5 text-xs ${dashData.overdue_count > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              <AlertTriangle size={12} />{dashData.overdue_count > 0 ? 'Needs attention' : 'All up to date'}
            </div>
          </DashboardWidget>
          <DashboardWidget title="Open Tasks" value={dashData.open_items} subtitle="Across all boards">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><CheckSquare size={12} /> Board items in progress</div>
          </DashboardWidget>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>AR Aging</p>
            <div className="flex justify-center"><BarChart data={agingBars} width={320} height={150} formatValue={(v) => fmtCurrency(v)} /></div>
            <div className="flex gap-4 justify-center mt-2 flex-wrap">
              {agingBars.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />{b.label}: {fmtCurrency(b.value)}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Top Customers</p>
            {dashData.top_customers.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No paid invoices yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}>
                  <th className="pb-2 font-medium">Customer</th><th className="pb-2 font-medium text-right">Revenue</th><th className="pb-2 font-medium text-right">Invoices</th>
                </tr></thead>
                <tbody>{dashData.top_customers.map((c, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c.customer_name}</td>
                    <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(typeof c.revenue === 'string' ? parseFloat(c.revenue) : c.revenue)}</td>
                    <td className="py-2 text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.invoice_count}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Invoice Status Breakdown</p>
          {dashData.invoice_status_breakdown.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No invoices found</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {dashData.invoice_status_breakdown.map((s) => (
                <div key={s.status} className="flex flex-col gap-1 px-4 py-3 rounded-lg border min-w-[110px]" style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-bg-hover)' }}>
                  <span className="text-xs font-medium" style={{ color: STATUS_COLORS[s.status] ?? '#9ca3af' }}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.count}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{fmtCurrency(typeof s.total === 'string' ? parseFloat(s.total) : s.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderExpenses() {
    if (expLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading expenses...</div>

    const s = expenseData?.summary

    const catBars = (expenseData?.by_category ?? []).map((c) => ({
      label: c.category, value: c.amount, color: '#818cf8',
    }))

    const monthBars = (expenseData?.by_month ?? []).map((m) => ({
      label: m.month.slice(5), value: m.amount, color: '#34d399',
    }))

    const expenseList = expenseData?.expenses?.data ?? []

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Expense Report</h2>
          <Button size="sm" onClick={() => downloadCSV(wid, 'expenses', expenseFrom, expenseTo)}>
            <Download size={13} /> CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DashboardWidget title="Total Claims" value={s?.total_count ?? 0} subtitle="In period">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><TrendingUp size={12} /> All expenses</div>
          </DashboardWidget>
          <DashboardWidget title="Total Amount" value={fmtCurrency(s?.total_amount ?? 0)} subtitle="Sum of all claims">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><DollarSign size={12} /> {s?.total_count ?? 0} claims</div>
          </DashboardWidget>
          <DashboardWidget title="Pending" value={fmtCurrency(s?.pending ?? 0)} subtitle="Awaiting approval">
            <div className="flex items-center gap-1.5 text-xs text-yellow-400"><Clock size={12} /> Needs review</div>
          </DashboardWidget>
          <DashboardWidget title="Approved" value={fmtCurrency(s?.approved ?? 0)} subtitle="Approved expenses">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckSquare size={12} /> Approved</div>
          </DashboardWidget>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>By Category</p>
            {catBars.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No expense data</p>
            ) : (
              <div className="flex justify-center"><BarChart data={catBars} width={320} height={160} formatValue={(v) => fmtCurrency(v)} /></div>
            )}
          </div>
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>By Month</p>
            {monthBars.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No expense data</p>
            ) : (
              <div className="flex justify-center"><BarChart data={monthBars} width={320} height={160} formatValue={(v) => fmtCurrency(v)} /></div>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Expense Claims</p>
          {expenseList.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No expense claims found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}>
                  <th className="pb-2 font-medium">Title</th><th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right">Amount</th><th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr></thead>
                <tbody>{expenseList.map((e: any) => (
                  <tr key={e.id} className="border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{e.title}</td>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{e.category}</td>
                    <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(parseFloat(e.amount))}</td>
                    <td className="py-2 text-xs"><span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: (STATUS_COLORS[e.status] ?? '#6b7280') + '20', color: STATUS_COLORS[e.status] ?? '#9ca3af' }}>{e.status}</span></td>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(e.expense_date)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderProcurement() {
    if (procLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading procurement...</div>

    const s = procData?.summary

    const supplierBars = (procData?.by_supplier ?? []).slice(0, 8).map((sup) => ({
      label: sup.supplier_name.length > 15 ? sup.supplier_name.slice(0, 15) + '...' : sup.supplier_name,
      value: sup.total, color: '#60a5fa',
    }))

    const monthBars = (procData?.by_month ?? []).map((m) => ({
      label: m.month.slice(5), value: m.amount, color: '#818cf8',
    }))

    const orderList = procData?.orders?.data ?? []

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Procurement Report</h2>
          <Button size="sm" onClick={() => downloadCSV(wid, 'procurement', procurementFrom, procurementTo)}>
            <Download size={13} /> CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DashboardWidget title="Total Orders" value={s?.total_orders ?? 0} subtitle="In period">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><ShoppingCart size={12} /> Purchase orders</div>
          </DashboardWidget>
          <DashboardWidget title="Total Value" value={fmtCurrency(s?.total_value ?? 0)} subtitle="Sum of all orders">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><DollarSign size={12} /> PO value</div>
          </DashboardWidget>
          <DashboardWidget title="Pending" value={fmtCurrency(s?.pending ?? 0)} subtitle="Draft/Sent orders">
            <div className="flex items-center gap-1.5 text-xs text-yellow-400"><Clock size={12} /> Not yet received</div>
          </DashboardWidget>
          <DashboardWidget title="Received" value={fmtCurrency(s?.received ?? 0)} subtitle="Received orders">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckSquare size={12} /> Completed</div>
          </DashboardWidget>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Top Suppliers</p>
            {supplierBars.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No supplier data</p>
            ) : (
              <div className="flex justify-center"><BarChart data={supplierBars} width={320} height={160} formatValue={(v) => fmtCurrency(v)} /></div>
            )}
          </div>
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>By Month</p>
            {monthBars.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No procurement data</p>
            ) : (
              <div className="flex justify-center"><BarChart data={monthBars} width={320} height={160} formatValue={(v) => fmtCurrency(v)} /></div>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Purchase Orders</p>
          {orderList.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No purchase orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}>
                  <th className="pb-2 font-medium">Order #</th><th className="pb-2 font-medium">Supplier</th>
                  <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium">Order Date</th><th className="pb-2 font-medium">Expected</th>
                </tr></thead>
                <tbody>{orderList.map((o: any) => (
                  <tr key={o.id} className="border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{o.order_number}</td>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{o.supplier_name}</td>
                    <td className="py-2 text-xs"><span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: (STATUS_COLORS[o.status] ?? '#6b7280') + '20', color: STATUS_COLORS[o.status] ?? '#9ca3af' }}>{o.status}</span></td>
                    <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(parseFloat(o.total))}</td>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(o.order_date)}</td>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(o.expected_date)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderInventory() {
    if (invLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading inventory...</div>

    const inv = invData

    if (!inv || (inv.total_products === 0 && inv.total_stock === 0)) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: 'var(--color-text-muted)' }}>
          <Package size={48} strokeWidth={1} className="opacity-30" />
          <p className="text-sm font-medium">No inventory data yet</p>
          <p className="text-xs">Add products and stock items to see inventory insights here.</p>
        </div>
      )
    }

    const catBars = (inv.by_category ?? []).map((c) => ({
      label: c.category ?? 'Uncategorized', value: c.count, color: '#818cf8',
    }))

    return (
      <div className="p-6 space-y-6">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Inventory Report</h2>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DashboardWidget title="Products" value={inv.total_products} subtitle="Total products">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><Package size={12} /> Registered</div>
          </DashboardWidget>
          <DashboardWidget title="Total Stock" value={`${inv.total_stock} units`} subtitle="Across all items">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><TrendingUp size={12} /> In stock</div>
          </DashboardWidget>
          <DashboardWidget title="Low Stock" value={inv.low_stock_items} subtitle="Items &lt; 10 units">
            <div className={`flex items-center gap-1.5 text-xs ${inv.low_stock_items > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              <AlertTriangle size={12} />{inv.low_stock_items > 0 ? 'Needs reorder' : 'All stocked'}
            </div>
          </DashboardWidget>
          <DashboardWidget title="Categories" value={inv.categories} subtitle="Product categories">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><BarChart3 size={12} /> Groups</div>
          </DashboardWidget>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Products by Category</p>
            {catBars.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No categories</p>
            ) : (
              <div className="flex justify-center"><BarChart data={catBars} width={320} height={160} /></div>
            )}
          </div>
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Recent Products</p>
            {inv.recent_products.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No products yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}>
                  <th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">SKU</th><th className="pb-2 font-medium text-right">Price</th>
                </tr></thead>
                <tbody>{inv.recent_products.map((p) => (
                  <tr key={p.id} className="border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.name}</td>
                    <td className="py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.sku ?? '-'}</td>
                    <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(p.unit_price)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderPipeline() {
    if (pipeLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading pipeline data...</div>
    const d = pipelineData?.data
    const f = funnelData?.data
    if (!d) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>No pipeline data.</div>
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <DashboardWidget title="Avg Deal Cycle" value={`${d.avg_deal_cycle_days}d`} subtitle="Days from creation to won">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><Clock size={12} /> Last {crmPeriod} days</div>
          </DashboardWidget>
          <DashboardWidget title="Won Deals" value={d.won_deal_count} subtitle="In period">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><Target size={12} /> Closed won</div>
          </DashboardWidget>
          <DashboardWidget title="Velocity/Day" value={fmtCurrency(d.velocity_per_day)} subtitle="Revenue per day">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><TrendingUp size={12} /> Pipeline speed</div>
          </DashboardWidget>
        </div>

        {d.avg_days_by_stage && Object.keys(d.avg_days_by_stage).length > 0 && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Avg Days by Stage</p>
            <div className="space-y-2">
              {Object.entries(d.avg_days_by_stage).map(([stage, days]) => (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs w-40" style={{ color: 'var(--color-text-secondary)' }}>{stage}</span>
                  <div className="flex-1 rounded-full h-2" style={{ background: 'var(--color-bg-hover)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (days as number) / (d.avg_deal_cycle_days || 1) * 100)}%`, background: 'var(--color-accent)' }} />
                  </div>
                  <span className="text-xs w-12 text-right" style={{ color: 'var(--color-text-secondary)' }}>{days as number}d</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {f && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Funnel</p>
            <div className="space-y-2">
              {f.stages?.map((stage: any) => (
                <div key={stage.stage_id} className="flex items-center gap-3">
                  <span className="text-xs w-36 truncate" style={{ color: 'var(--color-text-secondary)' }}>{stage.stage_name}</span>
                  <div className="flex-1 rounded-full h-3" style={{ background: 'var(--color-bg-hover)' }}>
                    <div className="h-3 rounded-full" style={{ width: `${stage.deal_count > 0 ? Math.min(100, stage.deal_count) : 1}%`, background: 'var(--color-accent)' }} />
                  </div>
                  <span className="text-xs w-16 text-right" style={{ color: 'var(--color-text-secondary)' }}>{stage.deal_count}</span>
                  <span className="text-xs w-24 text-right font-mono" style={{ color: 'var(--color-text-muted)' }}>{fmtCurrency(stage.total_value)}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-glass-border)' }}>
                <span className="text-xs text-green-400 w-36">Won</span>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{f.won}</span>
                <span className="text-xs text-red-400 ml-8">Lost</span>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{f.lost}</span>
                <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>Conversion: {f.conversion_rate}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderRevenue() {
    if (revLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading revenue...</div>
    const d = revenueData?.data
    if (!d) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>No revenue data.</div>
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <DashboardWidget title="Revenue" value={fmtCurrency(d.total_revenue)} subtitle={`Last ${crmPeriod} days`} changePct={d.revenue_change_pct}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><TrendingUp size={12} /> Won deals</div>
          </DashboardWidget>
          <DashboardWidget title="Won Deals" value={d.won_deals} subtitle="Closed won">
            <div className="flex items-center gap-1.5 text-xs text-green-400"><Target size={12} /> Won</div>
          </DashboardWidget>
          <DashboardWidget title="Lost Deals" value={d.lost_deals} subtitle="Closed lost">
            <div className="flex items-center gap-1.5 text-xs text-red-400"><TrendingDown size={12} /> Lost</div>
          </DashboardWidget>
          <DashboardWidget title="Avg Deal Size" value={d.won_deals > 0 ? fmtCurrency(d.total_revenue / d.won_deals) : '$0'} subtitle="Per won deal">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><Activity size={12} /> Average</div>
          </DashboardWidget>
        </div>
        {d.by_day && d.by_day.length > 0 && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Revenue by Day</p>
            <div className="flex justify-center">
              <BarChart data={d.by_day.map((r: any) => ({ label: r.day.slice(5), value: parseFloat(r.revenue), color: '#34d399' }))} width={600} height={180} formatValue={(v) => fmtCurrency(v)} />
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderWinLoss() {
    if (wlLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading win/loss...</div>
    const d = winlossData?.data
    if (!d) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>No win/loss data.</div>
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <DashboardWidget title="Win Rate" value={`${d.win_rate}%`} subtitle="Closed won vs total">
            <div className="flex items-center gap-1.5 text-xs text-green-400"><Target size={12} /> Win rate</div>
          </DashboardWidget>
          <DashboardWidget title="Won Value" value={fmtCurrency(d.won_value)} subtitle="Total won revenue">
            <div className="flex items-center gap-1.5 text-xs text-green-400"><TrendingUp size={12} /> Won</div>
          </DashboardWidget>
          <DashboardWidget title="Lost Value" value={fmtCurrency(d.lost_value)} subtitle="Total lost revenue">
            <div className="flex items-center gap-1.5 text-xs text-red-400"><TrendingDown size={12} /> Lost</div>
          </DashboardWidget>
          <DashboardWidget title="Deals Closed" value={`${d.won_count + d.lost_count}`} subtitle={`${d.won_count} won · ${d.lost_count} lost`}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><Activity size={12} /> Total closed</div>
          </DashboardWidget>
        </div>
        {d.loss_reasons && d.loss_reasons.length > 0 && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Loss Reasons</p>
            <div className="space-y-2">
              {d.loss_reasons.map((r: any) => (
                <div key={r.loss_reason} className="flex items-center gap-3">
                  <span className="text-xs w-40 truncate" style={{ color: 'var(--color-text-secondary)' }}>{r.loss_reason}</span>
                  <div className="flex-1 rounded-full h-2" style={{ background: 'var(--color-bg-hover)' }}>
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${d.lost_count > 0 ? r.count / d.lost_count * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs w-12 text-right" style={{ color: 'var(--color-text-secondary)' }}>{r.count}</span>
                  <span className="text-xs w-24 text-right font-mono" style={{ color: 'var(--color-text-muted)' }}>{fmtCurrency(r.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderLeadSources() {
    if (lsLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading lead sources...</div>
    const d = leadSourcesData?.data
    if (!d) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>No lead source data.</div>
    return (
      <div className="p-6 space-y-6">
        <DashboardWidget title="Total Leads" value={d.total_leads} subtitle="All sources" />
        {d.sources && d.sources.length > 0 && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}>
                <th className="pb-2 font-medium">Source</th><th className="pb-2 font-medium text-right">Leads</th><th className="pb-2 font-medium text-right">%</th><th className="pb-2 font-medium text-right">Converted</th><th className="pb-2 font-medium text-right">Conv. Rate</th>
              </tr></thead>
              <tbody>{d.sources.map((s: any) => (
                <tr key={s.source} className="border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                  <td className="py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.source}</td>
                  <td className="py-2 text-right text-xs" style={{ color: 'var(--color-text-primary)' }}>{s.count}</td>
                  <td className="py-2 text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.pct}%</td>
                  <td className="py-2 text-right text-xs" style={{ color: 'var(--color-text-primary)' }}>{s.converted}</td>
                  <td className="py-2 text-right text-xs text-green-400">{s.conversion_rate}%</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function renderChurn() {
    if (churnLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading churn data...</div>
    const d = churnData?.data
    if (!d) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>No churn data.</div>
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <DashboardWidget title="Total Customers" value={d.total_customers} subtitle="All time">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><Users size={12} /> Customer base</div>
          </DashboardWidget>
          <DashboardWidget title="Active" value={d.active_customers} subtitle="Touched in period">
            <div className="flex items-center gap-1.5 text-xs text-green-400"><Activity size={12} /> Engaged</div>
          </DashboardWidget>
          <DashboardWidget title="At Risk" value={`${d.at_risk_count} (${d.churn_rate}%)`} subtitle="No touch in period">
            <div className="flex items-center gap-1.5 text-xs text-red-400"><TrendingDown size={12} /> Churn risk</div>
          </DashboardWidget>
        </div>
        {d.at_risk_contacts && d.at_risk_contacts.length > 0 && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>At-Risk Contacts</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}>
                <th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Email</th><th className="pb-2 font-medium text-right">Score</th><th className="pb-2 font-medium">Last Touch</th><th className="pb-2 font-medium text-right">Value</th>
              </tr></thead>
              <tbody>{d.at_risk_contacts.map((c: any) => (
                <tr key={c.id} className="border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                  <td className="py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c.first_name} {c.last_name}</td>
                  <td className="py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.email}</td>
                  <td className="py-2 text-right text-xs" style={{ color: 'var(--color-text-primary)' }}>{c.lead_score ?? '-'}</td>
                  <td className="py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.last_touched_at ? new Date(c.last_touched_at).toLocaleDateString() : 'Never'}</td>
                  <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(c.deal_value ?? 0)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function renderClv() {
    if (clvLoading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading CLV data...</div>
    const d = clvData?.data
    const cohort = cohortData?.data
    if (!d) return <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-muted)' }}>No CLV data.</div>
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <DashboardWidget title="Avg LTV" value={fmtCurrency(d.avg_ltv)} subtitle="Per customer with revenue">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><Activity size={12} /> Lifetime value</div>
          </DashboardWidget>
          <DashboardWidget title="Max LTV" value={fmtCurrency(d.max_ltv)} subtitle="Highest value customer">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><TrendingUp size={12} /> Top performer</div>
          </DashboardWidget>
          <DashboardWidget title="Total Revenue" value={fmtCurrency(d.total_revenue)} subtitle="All time won">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><DollarSign size={12} /> Closed won</div>
          </DashboardWidget>
          <DashboardWidget title="Rev/Contact" value={fmtCurrency(d.revenue_per_contact)} subtitle="Average across all">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}><Users size={12} /> Per contact</div>
          </DashboardWidget>
        </div>

        {d.by_lifecycle_stage && d.by_lifecycle_stage.length > 0 && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>LTV by Lifecycle Stage</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}>
                <th className="pb-2 font-medium">Stage</th><th className="pb-2 font-medium text-right">Contacts</th><th className="pb-2 font-medium text-right">Avg LTV</th><th className="pb-2 font-medium text-right">Total Value</th>
              </tr></thead>
              <tbody>{d.by_lifecycle_stage.map((s: any) => (
                <tr key={s.lifecycle_stage} className="border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                  <td className="py-2 text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>{s.lifecycle_stage}</td>
                  <td className="py-2 text-right text-xs" style={{ color: 'var(--color-text-primary)' }}>{s.count}</td>
                  <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(parseFloat(s.avg_ltv))}</td>
                  <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(parseFloat(s.total_value))}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {cohort && cohort.length > 0 && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-muted)' }}>Monthly Cohorts (last 12)</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}>
                <th className="pb-2 font-medium">Cohort</th><th className="pb-2 font-medium text-right">Acquired</th><th className="pb-2 font-medium text-right">Converted</th><th className="pb-2 font-medium text-right">Conv. Rate</th><th className="pb-2 font-medium text-right">Revenue</th><th className="pb-2 font-medium text-right">Rev/Contact</th>
              </tr></thead>
              <tbody>{cohort.map((c: any) => (
                <tr key={c.cohort} className="border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                  <td className="py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{new Date(c.cohort).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</td>
                  <td className="py-2 text-right text-xs" style={{ color: 'var(--color-text-primary)' }}>{c.acquired}</td>
                  <td className="py-2 text-right text-xs" style={{ color: 'var(--color-text-primary)' }}>{c.converted}</td>
                  <td className="py-2 text-right text-xs text-green-400">{c.conversion_rate}%</td>
                  <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(c.revenue)}</td>
                  <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtCurrency(c.revenue_per_contact)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: 'var(--color-bg-base)' }}>
      <div className="flex items-center gap-4 px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-glass-border)' }}>
        <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Reports &amp; Analytics</h1>

        <div className="flex gap-1 ml-8">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors`}
                style={activeTab === tab.key
                  ? { background: 'var(--color-accent)', color: '#fff' }
                  : { color: 'var(--color-text-muted)' }
                }
              >
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {(activeTab === 'overview') && (
          <div className="flex gap-1 ml-auto">
            {PERIODS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={period === value
                  ? { background: 'var(--color-accent)', color: '#fff' }
                  : { background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {(['pipeline', 'revenue', 'winloss']).includes(activeTab) && (
          <div className="flex gap-1 ml-auto">
            {[
              { label: '30d', value: '30' },
              { label: '60d', value: '60' },
              { label: '90d', value: '90' },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setCrmPeriod(value)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={crmPeriod === value
                  ? { background: 'var(--color-accent)', color: '#fff' }
                  : { background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {activeTab === 'churn' && (
          <div className="flex gap-1 ml-auto items-center">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Threshold:</span>
            {['30', '60', '90', '180'].map(v => (
              <button
                key={v}
                onClick={() => setChurnThreshold(v)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={churnThreshold === v
                  ? { background: 'var(--color-accent)', color: '#fff' }
                  : { background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }
                }
              >
                {v}d
              </button>
            ))}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={expenseFrom} onChange={(e) => setExpenseFrom(e.target.value)}
              className="text-xs rounded px-2 py-1" style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>to</span>
            <input type="date" value={expenseTo} onChange={(e) => setExpenseTo(e.target.value)}
              className="text-xs rounded px-2 py-1" style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
          </div>
        )}
        {activeTab === 'procurement' && (
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={procurementFrom} onChange={(e) => setProcurementFrom(e.target.value)}
              className="text-xs rounded px-2 py-1" style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>to</span>
            <input type="date" value={procurementTo} onChange={(e) => setProcurementTo(e.target.value)}
              className="text-xs rounded px-2 py-1" style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'expenses' && renderExpenses()}
        {activeTab === 'procurement' && renderProcurement()}
        {activeTab === 'inventory' && renderInventory()}
        {activeTab === 'pipeline' && renderPipeline()}
        {activeTab === 'revenue' && renderRevenue()}
        {activeTab === 'winloss' && renderWinLoss()}
        {activeTab === 'leads' && renderLeadSources()}
        {activeTab === 'churn' && renderChurn()}
        {activeTab === 'clv' && renderClv()}
      </div>
    </div>
  )
}

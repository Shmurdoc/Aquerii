import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Clock, Plus, X, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TABS = ['Directory', 'Capacity', 'Attendance', 'Leave', 'Expenses'] as const
type Tab = (typeof TABS)[number]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string; name: string; email: string; role: string
  job_title: string | null; department: string | null
  phone: string | null; employed_at: string | null
}

interface AttendanceLog {
  id: string; clocked_in_at: string; clocked_out_at: string | null; status: string; notes: string | null
}

interface LeaveRequest {
  id: string; user_id: string; user_name: string; user_email: string
  type: string; start_date: string; end_date: string; reason: string | null
  status: string; approved_by: string | null; decline_reason: string | null
  created_at: string
}

interface ExpenseClaim {
  id: string; user_id: string; user_name: string; user_email: string
  title: string; description: string | null; category: string
  amount: string; currency: string; expense_date: string; status: string
  receipt_path: string | null; created_at: string
}

interface LeaveBalance {
  total: number; used: number; remaining: number
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/60 text-yellow-300',
  approved: 'bg-emerald-900/60 text-emerald-300',
  declined: 'bg-red-900/60 text-red-300',
  reimbursed: 'bg-blue-900/60 text-blue-300',
  cancelled: 'bg-gray-700 text-gray-400',
  present: 'bg-emerald-900/60 text-emerald-300',
  late: 'bg-orange-900/60 text-orange-300',
  half_day: 'bg-yellow-900/60 text-yellow-300',
  absent: 'bg-red-900/60 text-red-300',
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-700 text-gray-300'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Glass Card ───────────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Directory
// ═══════════════════════════════════════════════════════════════════════════════

function DirectoryTab({ wid }: { wid: string }) {
  const [search, setSearch] = useState('')

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', wid],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/hr/employees`)
      return res.data.employees
    },
    enabled: !!wid,
  })

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.job_title ?? '').toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees..."
          className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((emp) => (
          <GlassCard key={emp.id} className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent-text)] text-sm font-bold">
                {emp.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{emp.name}</p>
                {emp.job_title && <p className="text-xs text-[var(--color-text-muted)] truncate">{emp.job_title}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
              {emp.department && <span>Dept: {emp.department}</span>}
              {emp.email && <span className="truncate">{emp.email}</span>}
              {emp.phone && <span>{emp.phone}</span>}
            </div>
          </GlassCard>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] col-span-full text-center py-8">No employees found.</p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Attendance
// ═══════════════════════════════════════════════════════════════════════════════

function AttendanceTab({ wid }: { wid: string }) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  const { data: logs = [] } = useQuery<AttendanceLog[]>({
    queryKey: ['attendance', wid, userId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/hr/attendance`, {
        params: { user_id: userId, days: 30 },
      })
      return res.data.attendance
    },
    enabled: !!wid && !!userId,
  })

  const todayActive = logs.find((l) => !l.clocked_out_at)

  const clockIn = useMutation({
    mutationFn: () => api.post(`/workspaces/${wid}/hr/attendance/clock-in`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', wid, userId] })
      toast.success('Clocked in!')
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Clock-in failed'),
  })

  const clockOut = useMutation({
    mutationFn: () => api.post(`/workspaces/${wid}/hr/attendance/clock-out`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', wid, userId] })
      toast.success('Clocked out!')
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Clock-out failed'),
  })

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="p-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
            {todayActive ? 'Currently clocked in' : 'Not clocked in'}
          </h3>
          {todayActive && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Since {new Date(todayActive.clocked_in_at).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => clockIn.mutate()}
            disabled={!!todayActive || clockIn.isPending}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
              todayActive
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
            )}
          >
            <Clock size={16} />
            {clockIn.isPending ? '...' : 'Clock In'}
          </button>
          <button
            onClick={() => clockOut.mutate()}
            disabled={!todayActive || clockOut.isPending}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
              !todayActive
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30'
            )}
          >
            <Clock size={16} />
            {clockOut.isPending ? '...' : 'Clock Out'}
          </button>
        </div>
      </GlassCard>

      <div>
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Recent Attendance</h4>
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-glass-border)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Clock In</th>
                <th className="text-left px-4 py-2.5 font-medium">Clock Out</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--color-glass-border)] last:border-0">
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                    {new Date(log.clocked_in_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {new Date(log.clocked_in_at).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {log.clocked_out_at ? new Date(log.clocked_out_at).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={log.status} /></td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                    No attendance records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </GlassCard>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Leave
// ═══════════════════════════════════════════════════════════════════════════════

const LEAVE_TYPES = ['annual', 'sick', 'personal', 'bereavement', 'maternity', 'paternity', 'other']

function LeaveTab({ wid }: { wid: string }) {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'annual', start_date: '', end_date: '', reason: '' })

  const { data: leaves = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leave', wid],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/hr/leave`)
      return res.data.leave_requests
    },
    enabled: !!wid,
  })

  const { data: balances = {} as Record<string, LeaveBalance> } = useQuery({
    queryKey: ['leave-balance', wid],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/hr/leave/balance`)
      return res.data.balances
    },
    enabled: !!wid,
  })

  const createLeave = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${wid}/hr/leave`, {
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave', wid] })
      qc.invalidateQueries({ queryKey: ['leave-balance', wid] })
      setShowForm(false)
      setForm({ type: 'annual', start_date: '', end_date: '', reason: '' })
      toast.success('Leave request submitted.')
    },
    onError: () => toast.error('Failed to submit leave request.'),
  })

  const approveLeave = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.patch(`/workspaces/${wid}/hr/leave/${id}/action`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave', wid] })
      qc.invalidateQueries({ queryKey: ['leave-balance', wid] })
      toast.success('Leave updated.')
    },
    onError: () => toast.error('Failed to update leave.'),
  })

  const canManage = role === 'owner' || role === 'admin'

  function calcDays(start: string, end: string) {
    return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Leave Balance</h4>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold transition-colors"
        >
          <Plus size={14} /> New Request
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(balances) as [string, LeaveBalance][]).map(([type, bal]) => (
          <GlassCard key={type} className="p-4 flex flex-col gap-1">
            <p className="text-xs text-[var(--color-text-muted)] capitalize">{type}</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              {bal.remaining} / {bal.total}
            </p>
            <div className="w-full h-1.5 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                style={{ width: `${bal.total > 0 ? (bal.used / bal.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">{bal.used} used</p>
          </GlassCard>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-md p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--color-text-primary)]">New Leave Request</h3>
              <button onClick={() => setShowForm(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">Start Date</label>
                  <input
                    type="date" value={form.start_date} min={today}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">End Date</label>
                  <input
                    type="date" value={form.end_date} min={form.start_date || today}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">Reason</label>
                <textarea
                  value={form.reason} rows={3}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
                />
              </div>
            </div>
            <button
              onClick={() => createLeave.mutate()}
              disabled={!form.start_date || !form.end_date || createLeave.isPending}
              className="w-full py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {createLeave.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </GlassCard>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Leave History</h4>
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-glass-border)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 font-medium">Start</th>
                <th className="text-left px-4 py-2.5 font-medium">End</th>
                <th className="text-left px-4 py-2.5 font-medium">Days</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Reason</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} className="border-b border-[var(--color-glass-border)] last:border-0">
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)] capitalize">{l.type}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)] text-xs">{l.start_date}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)] text-xs">{l.end_date}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)] text-xs font-mono">{calcDays(l.start_date, l.end_date)}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)] text-xs hidden md:table-cell max-w-[200px] truncate">
                    {l.reason ?? '—'}
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    {l.status === 'pending' && canManage && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => approveLeave.mutate({ id: l.id, action: 'approved' })}
                          className="px-2 py-1 rounded bg-emerald-900/60 text-emerald-300 text-xs hover:bg-emerald-800/60 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => approveLeave.mutate({ id: l.id, action: 'declined' })}
                          className="px-2 py-1 rounded bg-red-900/60 text-red-300 text-xs hover:bg-red-800/60 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                    No leave requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </GlassCard>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Capacity
// ═══════════════════════════════════════════════════════════════════════════════

interface CapacityMember {
  user_id: string; name: string; email: string
  job_title: string | null; department: string | null
  weekly_capacity_hours: number; assigned_hours: number
  tracked_hours: number; utilization_pct: number
  active_task_count: number; capacity_notes: string | null
}

function CapacityTab({ wid }: { wid: string }) {
  const qc = useQueryClient()

  const { data: members = [], isLoading } = useQuery<CapacityMember[]>({
    queryKey: ['team-capacity', wid],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/hr/capacity`)
      return res.data.data
    },
    enabled: !!wid,
  })

  const updateCapacity = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { weekly_capacity_hours: number; capacity_notes?: string } }) =>
      api.patch(`/workspaces/${wid}/hr/capacity/${userId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-capacity', wid] })
      toast.success('Capacity updated.')
    },
    onError: () => toast.error('Failed to update capacity.'),
  })

  function utilizationColor(pct: number) {
    if (pct > 100) return 'bg-red-500'
    if (pct > 80) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  if (isLoading) {
    return <div className="text-sm text-[var(--color-text-muted)] py-8 text-center">Loading capacity data...</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--color-text-muted)]">
          Current week workload based on estimated hours of active tasks
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((m) => (
          <GlassCard key={m.user_id} className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent-text)] text-sm font-bold">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{m.name}</p>
                {m.job_title && <p className="text-xs text-[var(--color-text-muted)] truncate">{m.job_title}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">Utilization</span>
                <span className="font-mono font-medium text-[var(--color-text-primary)]">{m.utilization_pct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${utilizationColor(m.utilization_pct)}`}
                  style={{ width: `${Math.min(m.utilization_pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>{m.assigned_hours}h assigned</span>
                <span>{m.weekly_capacity_hours}h capacity</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span>{m.active_task_count} active tasks</span>
              {m.tracked_hours > 0 && <span>· {m.tracked_hours}h tracked</span>}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={168}
                step={0.5}
                value={m.weekly_capacity_hours}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  updateCapacity.mutate({ userId: m.user_id, data: { weekly_capacity_hours: val } })
                }}
                className="w-20 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <span className="text-xs text-[var(--color-text-muted)]">hrs/week</span>
            </div>
          </GlassCard>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] col-span-full text-center py-8">No team members found.</p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Expenses
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORIES = ['travel', 'meals', 'office_supplies', 'utilities', 'other']

function ExpensesTab({ wid }: { wid: string }) {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', category: 'travel', amount: '', currency: 'USD',
    expense_date: '', description: '', receipt: null as File | null,
  })

  const { data: expenses = [] } = useQuery<ExpenseClaim[]>({
    queryKey: ['expenses', wid],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/hr/expenses`)
      return res.data.expenses
    },
    enabled: !!wid,
  })

  const createExpense = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('category', form.category)
      fd.append('amount', form.amount)
      fd.append('expense_date', form.expense_date)
      fd.append('currency', form.currency)
      if (form.description) fd.append('description', form.description)
      if (form.receipt) fd.append('receipt', form.receipt)

      const res = await api.post(`/workspaces/${wid}/hr/expenses`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', wid] })
      setShowForm(false)
      setForm({ title: '', category: 'travel', amount: '', currency: 'USD', expense_date: '', description: '', receipt: null })
      toast.success('Expense claim submitted.')
    },
    onError: () => toast.error('Failed to submit expense.'),
  })

  const approveExpense = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.patch(`/workspaces/${wid}/hr/expenses/${id}/action`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', wid] })
      toast.success('Expense updated.')
    },
    onError: () => toast.error('Failed to update expense.'),
  })

  const canManage = role === 'owner' || role === 'admin'

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Expense Claims</h4>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold transition-colors"
        >
          <Plus size={14} /> New Expense
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-md p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--color-text-primary)]">New Expense Claim</h3>
              <button onClick={() => setShowForm(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">Title *</label>
                <input
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">Category</label>
                  <select
                    value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">Currency</label>
                  <input
                    value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">Amount *</label>
                  <input
                    type="number" step="0.01" min="0.01" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">Expense Date</label>
                  <input
                    type="date" value={form.expense_date} max={today}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">Description</label>
                <textarea
                  value={form.description} rows={2}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">Receipt (optional)</label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--color-glass-border)] cursor-pointer hover:border-[var(--color-accent)] transition-colors text-sm text-[var(--color-text-muted)]">
                  <Upload size={14} />
                  {form.receipt ? form.receipt.name : 'Upload receipt (PDF, JPG, PNG)'}
                  <input
                    type="file" accept=".pdf,.jpg,.png" className="hidden"
                    onChange={(e) => setForm({ ...form, receipt: e.target.files?.[0] ?? null })}
                  />
                </label>
              </div>
            </div>
            <button
              onClick={() => createExpense.mutate()}
              disabled={!form.title || !form.amount || !form.expense_date || createExpense.isPending}
              className="w-full py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {createExpense.isPending ? 'Submitting...' : 'Submit Claim'}
            </button>
          </GlassCard>
        </div>
      )}

      <GlassCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-glass-border)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-2.5 font-medium">Title</th>
              <th className="text-left px-4 py-2.5 font-medium">Category</th>
              <th className="text-left px-4 py-2.5 font-medium">Amount</th>
              <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Date</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">User</th>
              <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((ex) => (
              <tr key={ex.id} className="border-b border-[var(--color-glass-border)] last:border-0">
                <td className="px-4 py-2.5 text-[var(--color-text-primary)]">{ex.title}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)] text-xs capitalize">
                  {ex.category.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-mono text-xs">
                  {ex.currency} {parseFloat(ex.amount).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)] text-xs hidden md:table-cell">
                  {ex.expense_date}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={ex.status} /></td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)] text-xs hidden md:table-cell">
                  {ex.user_name}
                </td>
                <td className="px-4 py-2.5 hidden lg:table-cell">
                  {canManage && ex.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => approveExpense.mutate({ id: ex.id, action: 'approved' })}
                        className="px-2 py-1 rounded bg-emerald-900/60 text-emerald-300 text-xs hover:bg-emerald-800/60 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => approveExpense.mutate({ id: ex.id, action: 'declined' })}
                        className="px-2 py-1 rounded bg-red-900/60 text-red-300 text-xs hover:bg-red-800/60 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {canManage && ex.status === 'approved' && (
                    <button
                      onClick={() => approveExpense.mutate({ id: ex.id, action: 'reimbursed' })}
                      className="px-2 py-1 rounded bg-blue-900/60 text-blue-300 text-xs hover:bg-blue-800/60 transition-colors"
                    >
                      Mark Reimbursed
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No expense claims yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function EmployeePage() {
  const [tab, setTab] = useState<Tab>('Directory')
  const workspace = useAuthStore((s) => s.workspace)
  const wid = workspace?.id ?? ''

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[var(--color-glass-border)] shrink-0">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Employees</h1>
      </div>

      <div className="flex gap-0 px-6 border-b border-[var(--color-glass-border)] shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-[1px]',
              tab === t
                ? 'border-[var(--color-accent)] text-[var(--color-accent-text)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'Directory' && <DirectoryTab wid={wid} />}
        {tab === 'Capacity' && <CapacityTab wid={wid} />}
        {tab === 'Attendance' && <AttendanceTab wid={wid} />}
        {tab === 'Leave' && <LeaveTab wid={wid} />}
        {tab === 'Expenses' && <ExpensesTab wid={wid} />}
      </div>
    </div>
  )
}

import { useAuthStore } from '@/stores/authStore'
import { erpReportSchedules, ReportSchedule } from '@/lib/erp'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2, Play, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

function NewScheduleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', report_type: 'dashboard', frequency: 'weekly', recipients: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await erpReportSchedules.create({ ...form, recipients: form.recipients.split(',').map(s => s.trim()), is_active: true } as any)
    qc.invalidateQueries({ queryKey: ['report-schedules'] })
    toast.success('Schedule created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Report Schedule</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><span className="text-lg">×</span></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Schedule name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <select className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" value={form.report_type} onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}>
            <option value="dashboard">Dashboard</option>
            <option value="expenses">Expenses</option>
            <option value="procurement">Procurement</option>
            <option value="inventory">Inventory</option>
          </select>
          <select className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Recipients (comma-separated emails)" value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))} required />
          <Button type="submit">Create Schedule</Button>
        </form>
      </Card>
    </div>
  )
}

export default function ReportSchedulesPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['report-schedules', w],
    queryFn: () => erpReportSchedules.list(),
    enabled: !!w,
  })

  const deleteSchedule = useMutation({
    mutationFn: (id: string) => erpReportSchedules.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-schedules'] }); toast.success('Deleted.') },
  })

  const runNow = useMutation({
    mutationFn: (id: string) => erpReportSchedules.runNow(id),
    onSuccess: () => toast.success('Report generated.'),
  })

  const columns: Column<ReportSchedule>[] = [
    { key: 'name', header: 'Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'report_type', header: 'Type', render: r => <Badge variant="info">{r.report_type}</Badge> },
    { key: 'frequency', header: 'Frequency', render: r => <Badge variant="default">{r.frequency}</Badge> },
    { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'next_run_at', header: 'Next Run', render: r => r.next_run_at ? formatDate(r.next_run_at) : '—' },
    { key: 'id', header: 'Actions', render: r => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => runNow.mutate(r.id)}>Run Now</Button>
        <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deleteSchedule.mutate(r.id) }}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Report Schedules</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> New Schedule</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={schedules} loading={isLoading} emptyMessage="No schedules configured" />
      </Card>
      {showAdd && <NewScheduleModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

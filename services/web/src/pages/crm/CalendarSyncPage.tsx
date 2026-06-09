/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useAuthStore } from '@/stores/authStore'
import { useCrmCalendarSyncs, useCreateCrmCalendarSync, useDeleteCrmCalendarSync, useSyncCrmCalendar, CrmCalendarSync } from '@/lib/crm'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Plus, Trash2, RefreshCw, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useState } from 'react'

function NewSyncModal({ onClose }: { onClose: () => void }) {
  const w = useAuthStore(s => s.workspace?.id)
  const create = useCreateCrmCalendarSync(w)
  const [form, setForm] = useState({ provider: 'google' as 'google' | 'microsoft', calendar_id: '', calendar_name: '', sync_direction: 'pull' as 'pull' | 'push' | 'both' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await create.mutateAsync({ ...form, is_active: true } as any)
    toast.success('Calendar sync created.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Calendar Sync</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X size={14} /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value as any }))}>
            <option value="google">Google Calendar</option>
            <option value="microsoft">Microsoft Outlook</option>
          </select>
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Calendar ID" value={form.calendar_id} onChange={e => setForm(f => ({ ...f, calendar_id: e.target.value }))} required />
          <input className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Calendar name" value={form.calendar_name} onChange={e => setForm(f => ({ ...f, calendar_name: e.target.value }))} required />
          <select className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" value={form.sync_direction} onChange={e => setForm(f => ({ ...f, sync_direction: e.target.value as any }))}>
            <option value="pull">Pull only</option>
            <option value="push">Push only</option>
            <option value="both">Both ways</option>
          </select>
          <Button type="submit" loading={create.isPending}>Create Sync</Button>
        </form>
      </Card>
    </div>
  )
}

export default function CalendarSyncPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const { data: syncs = [], isLoading } = useCrmCalendarSyncs(w)
  const deleteSync = useDeleteCrmCalendarSync(w, '')
  const syncNow = useSyncCrmCalendar(w, '')
  const [showAdd, setShowAdd] = useState(false)

  const columns: Column<CrmCalendarSync>[] = [
    { key: 'provider', header: 'Provider', render: r => <span className="font-medium capitalize">{r.provider}</span> },
    { key: 'calendar_name', header: 'Calendar', render: r => r.calendar_name },
    { key: 'sync_direction', header: 'Direction', render: r => <Badge variant="info">{r.sync_direction}</Badge> },
    { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'last_synced_at', header: 'Last Sync', render: r => r.last_synced_at ? formatDate(r.last_synced_at) : 'Never' },
    { key: 'id', header: 'Actions', render: r => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={async () => { await syncNow.mutateAsync(r.id); toast.success('Sync started.') }}>
          <RefreshCw size={12} />
        </Button>
        <Button variant="ghost" size="sm" onClick={async () => {
          if (confirm('Delete this sync?')) {
            await deleteSync.mutateAsync(r.id)
            toast.success('Sync deleted.')
          }
        }}><Trash2 size={12} /></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar Sync</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Sync</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={syncs} loading={isLoading} emptyMessage="No calendar syncs configured" />
      </Card>
      {showAdd && <NewSyncModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

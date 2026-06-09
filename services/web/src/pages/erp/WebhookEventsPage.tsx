/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useAuthStore } from '@/stores/authStore'
import { erpWebhookEvents, WebhookEvent } from '@/lib/erp'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const statusColors: Record<string, 'default' | 'success' | 'danger'> = {
  delivered: 'success',
  failed: 'danger',
  pending: 'default',
}

export default function WebhookEventsPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['webhook-events', w],
    queryFn: () => erpWebhookEvents.list(),
    enabled: !!w,
  })

  const retry = useMutation({
    mutationFn: (id: string) => erpWebhookEvents.retry(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhook-events'] }); toast.success('Retry triggered.') },
  })

  const columns: Column<WebhookEvent>[] = [
    { key: 'event_type', header: 'Event', render: r => <Badge variant="info">{r.event_type}</Badge> },
    { key: 'status', header: 'Status', render: r => <Badge variant={statusColors[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'attempts', header: 'Attempts', render: r => r.attempts },
    { key: 'last_attempt_at', header: 'Last Attempt', render: r => r.last_attempt_at ? formatDate(r.last_attempt_at) : 'â€”' },
    { key: 'created_at', header: 'Created', render: r => formatDate(r.created_at) },
    { key: 'id', header: '', render: r => r.status === 'failed' ? (
      <Button variant="ghost" size="sm" onClick={() => retry.mutate(r.id)}>
        <RefreshCw size={12} /> Retry
      </Button>
    ) : null },
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Webhook Events</h1>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={events} loading={isLoading} emptyMessage="No webhook events" />
      </Card>
    </div>
  )
}

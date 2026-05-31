import { useAuthStore } from '@/stores/authStore'
import { erpAuditLogs, AuditLogEntry } from '@/lib/erp'
import { Card, Badge, DataTable, type Column } from '@/components/ui'
import { formatDate } from '@/lib/erp'
import { useQuery } from '@tanstack/react-query'

export default function AuditLogsPage() {
  const w = useAuthStore(s => s.workspace?.id)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', w],
    queryFn: () => erpAuditLogs.list({ limit: 100 }),
    enabled: !!w,
  })

  const columns: Column<AuditLogEntry>[] = [
    { key: 'action', header: 'Action', render: r => <Badge variant="info">{r.action}</Badge> },
    { key: 'subject_type', header: 'Subject', render: r => <span className="font-medium">{r.subject_type}</span> },
    { key: 'subject_id', header: 'Subject ID', render: r => <span className="font-mono text-xs">{r.subject_id?.slice(0, 8)}</span> },
    { key: 'user_id', header: 'User', render: r => <span className="font-mono text-xs">{r.user_id?.slice(0, 8)}</span> },
    { key: 'created_at', header: 'Time', render: r => formatDate(r.created_at) },
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={logs} loading={isLoading} emptyMessage="No audit logs" />
      </Card>
    </div>
  )
}

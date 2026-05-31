import { useAuthStore } from '@/stores/authStore'
import { useCrmDealApprovals, useApproveDeal, useRejectDealApproval, CrmDealApproval } from '@/lib/crm'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'

const statusColors: Record<string, 'default' | 'success' | 'danger'> = {
  pending: 'default',
  approved: 'success',
  rejected: 'danger',
}

export default function DealApprovalsPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const { data: approvals = [], isLoading } = useCrmDealApprovals(w)
  const approve = useApproveDeal(w, '')
  const reject = useRejectDealApproval(w, '')

  const columns: Column<CrmDealApproval>[] = [
    { key: 'deal_id', header: 'Deal', render: r => <span className="font-medium">{r.deal?.title ?? r.deal_id.slice(0, 8)}</span> },
    { key: 'status', header: 'Status', render: r => <Badge variant={statusColors[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'approver', header: 'Approver', render: r => r.approver?.name ?? '—' },
    { key: 'notes', header: 'Notes', render: r => r.notes ?? '—' },
    { key: 'created_at', header: 'Submitted', render: r => formatDate(r.created_at) },
    { key: 'id', header: 'Actions', render: r => r.status === 'pending' ? (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={async () => { await approve.mutateAsync(r.id); toast.success('Approved.') }}>Approve</Button>
        <Button variant="ghost" size="sm" onClick={async () => { await reject.mutateAsync(r.id); toast.success('Rejected.') }}>Reject</Button>
      </div>
    ) : null },
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Deal Approvals</h1>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={approvals} loading={isLoading} emptyMessage="No pending approvals" />
      </Card>
    </div>
  )
}

// @ts-nocheck — pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useAuthStore } from '@/stores/authStore'
import { erpFinancialApprovals, FinancialApproval } from '@/lib/erp'
import { Card, Badge, Button, DataTable, type Column } from '@/components/ui'
import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/erp'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const statusColors: Record<string, 'default' | 'success' | 'danger'> = {
  pending: 'default',
  approved: 'success',
  rejected: 'danger',
}

export default function FinancialApprovalsPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['financial-approvals', w],
    queryFn: () => erpFinancialApprovals.list(),
    enabled: !!w,
  })

  const approve = useMutation({
    mutationFn: (id: string) => erpFinancialApprovals.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial-approvals'] }); toast.success('Approved.') },
  })

  const reject = useMutation({
    mutationFn: (id: string) => erpFinancialApprovals.reject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial-approvals'] }); toast.success('Rejected.') },
  })

  const columns: Column<FinancialApproval>[] = [
    { key: 'invoice_id', header: 'Invoice', render: r => <span className="font-medium">{r.invoice_id.slice(0, 8)}</span> },
    { key: 'status', header: 'Status', render: r => <Badge variant={statusColors[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'notes', header: 'Notes', render: r => r.notes ?? 'â€”' },
    { key: 'created_at', header: 'Submitted', render: r => formatDate(r.created_at) },
    { key: 'id', header: 'Actions', render: r => r.status === 'pending' ? (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => approve.mutate(r.id)}>Approve</Button>
        <Button variant="ghost" size="sm" onClick={() => reject.mutate(r.id)}>Reject</Button>
      </div>
    ) : null },
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Financial Approvals</h1>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={approvals} loading={isLoading} emptyMessage="No pending approvals" />
      </Card>
    </div>
  )
}

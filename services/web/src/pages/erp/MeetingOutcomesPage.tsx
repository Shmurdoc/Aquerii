/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — pre-existing TS debt, see WEB_TS_DEBT.md for cleanup plan
import { useAuthStore } from '@/stores/authStore'
import { erpMeetingOutcomes, MeetingOutcome } from '@/lib/erp'
import { Card, Badge, DataTable, type Column } from '@/components/ui'
import { formatDate } from '@/lib/erp'
import { useQuery } from '@tanstack/react-query'

export default function MeetingOutcomesPage() {
  const w = useAuthStore(s => s.workspace?.id)

  const { data: outcomes = [], isLoading } = useQuery({
    queryKey: ['meeting-outcomes', w],
    queryFn: () => erpMeetingOutcomes.list(),
    enabled: !!w,
  })

  const columns: Column<MeetingOutcome>[] = [
    { key: 'meeting_id', header: 'Meeting', render: r => <span className="font-medium">{r.meeting_id.slice(0, 8)}</span> },
    { key: 'summary', header: 'Summary', render: r => <span className="line-clamp-1">{r.summary}</span> },
    { key: 'action_items', header: 'Actions', render: r => r.action_items?.length ?? 0 },
    { key: 'effectiveness_score', header: 'Score', render: r => r.effectiveness_score != null ? `${r.effectiveness_score}/10` : 'â€”' },
    { key: 'created_at', header: 'Date', render: r => formatDate(r.created_at) },
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Meeting Outcomes</h1>
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={outcomes} loading={isLoading} emptyMessage="No meeting outcomes recorded" />
      </Card>
    </div>
  )
}

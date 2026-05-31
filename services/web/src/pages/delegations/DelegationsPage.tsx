import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useDelegations, useRevoke, useAcceptDelegation } from '@/hooks/useDelegations'
import { Card, Badge, Button } from '@/components/ui'
import { formatDate } from '@/lib/erp'

const statusColors: Record<string, Parameters<typeof Badge>[0]['variant']> = {
  active: 'primary',
  revoked: 'danger',
  completed: 'info',
}

export default function DelegationsPage() {
  const userId = useAuthStore((s) => s.user?.id)
  const [direction, setDirection] = useState<'sent' | 'received' | undefined>(undefined)
  const { data: delegations, isLoading } = useDelegations({ direction })
  const revoke = useRevoke()
  const accept = useAcceptDelegation()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Delegations</h1>
        <div className="flex gap-2">
          <Button variant={!direction ? 'primary' : 'secondary'} size="sm" onClick={() => setDirection(undefined)}>All</Button>
          <Button variant={direction === 'sent' ? 'primary' : 'secondary'} size="sm" onClick={() => setDirection('sent')}>Sent</Button>
          <Button variant={direction === 'received' ? 'primary' : 'secondary'} size="sm" onClick={() => setDirection('received')}>Received</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Loading delegations...</div>
      ) : !delegations?.length ? (
        <div className="text-muted-foreground py-8 text-center">No delegations found.</div>
      ) : (
        <div className="space-y-3">
          {delegations.map((d) => {
            const isSent = d.from_user_id === userId
            return (
              <Card key={d.id} className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.item?.title ?? 'Unknown task'}</span>
                    <Badge variant={statusColors[d.status]}>{d.status}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {isSent
                      ? `To: ${d.to_user?.name ?? d.to_user?.email ?? 'Unknown'}`
                      : `From: ${d.from_user?.name ?? d.from_user?.email ?? 'Unknown'}`
                    }
                  </p>
                  <p className="text-muted-foreground text-sm">{d.reason}</p>
                  <p className="text-muted-foreground text-xs">{formatDate(d.delegated_at)}</p>
                </div>
                <div className="flex gap-2">
                  {d.status === 'active' && !isSent && (
                    <Button size="sm" onClick={() => accept.mutate({ boardId: d.item_id, itemId: d.item_id })}>
                      Accept
                    </Button>
                  )}
                  {d.status === 'active' && isSent && (
                    <Button size="sm" variant="danger" onClick={() => revoke.mutate({ boardId: d.item_id, itemId: d.item_id })}>
                      Revoke
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

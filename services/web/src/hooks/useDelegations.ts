import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { erpDelegation } from '@/lib/erp'

export function useDelegations(params?: { direction?: 'sent' | 'received'; status?: string }) {
  return useQuery({
    queryKey: ['delegations', params],
    queryFn: () => erpDelegation.list(params),
  })
}

export function useDelegate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, itemId, toUserId, reason, expiresAt }: any) =>
      erpDelegation.delegate(boardId, itemId, toUserId, reason, expiresAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delegations'] }),
  })
}

export function useRevoke() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, itemId }: { boardId: string; itemId: string }) =>
      erpDelegation.revoke(boardId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delegations'] }),
  })
}

export function useAcceptDelegation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, itemId }: { boardId: string; itemId: string }) =>
      erpDelegation.accept(boardId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delegations'] }),
  })
}

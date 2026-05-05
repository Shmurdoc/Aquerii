import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { getSocket } from '@/lib/socket'
import { useEffect } from 'react'

export interface Item {
  id: string
  board_id: string
  group_id: string
  parent_id: string | null
  title: string
  status: string | null
  priority: string | null
  due_date: string | null
  position: number
  version: number
  column_values: Record<string, unknown>
  assignees: Array<{ id: string; name: string; avatar_url: string | null }>
}

export function useItems(boardId: string, groupId?: string) {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()

  // Subscribe to realtime updates for this board
  useEffect(() => {
    const socket = getSocket()
    const room   = `board:${boardId}`

    socket.emit('room:join', { room })

    const handler = (event: { type: string; payload: Record<string, unknown> }) => {
      if (['item.created', 'item.updated', 'item.deleted'].includes(event.type)) {
        qc.invalidateQueries({ queryKey: ['items', boardId] })
      }
    }
    socket.on('event', handler)

    return () => {
      socket.emit('room:leave', { room })
      socket.off('event', handler)
    }
  }, [boardId, qc])

  return useQuery({
    queryKey: ['items', boardId, groupId],
    queryFn: async () => {
      const params = groupId ? { group_id: groupId } : {}
      const res    = await api.get(`/workspaces/${workspace!.id}/boards/${boardId}/items`, { params })
      return res.data.data as Item[]
    },
    enabled: !!workspace && !!boardId,
  })
}

export function useCreateItem(boardId: string) {
  const qc        = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (data: { group_id: string; title?: string; column_values?: Record<string, unknown> }) =>
      api.post(`/workspaces/${workspace!.id}/boards/${boardId}/items`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

export function useUpdateItem(boardId: string) {
  const qc        = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<Item> & { expected_version?: number } }) =>
      api.patch(`/workspaces/${workspace!.id}/boards/${boardId}/items/${itemId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

export function useMoveItem(boardId: string) {
  const qc        = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: ({ itemId, groupId, position }: { itemId: string; groupId: string; position?: number }) =>
      api.post(`/workspaces/${workspace!.id}/boards/${boardId}/items/${itemId}/move`, {
        group_id: groupId, position,
      }),
    onMutate: async ({ itemId, groupId, position }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['items', boardId] })
      const prev = qc.getQueryData<Item[]>(['items', boardId])
      qc.setQueryData<Item[]>(['items', boardId], old =>
        old?.map(i => i.id === itemId ? { ...i, group_id: groupId, position: position ?? i.position } : i) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['items', boardId], ctx?.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

export function useDeleteItem(boardId: string) {
  const qc        = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete(`/workspaces/${workspace!.id}/boards/${boardId}/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

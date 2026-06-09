import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export interface BoardColumn {
  id: string
  name: string
  type: string
  position: number
  width: number
  settings: Record<string, unknown>
  is_system: boolean
}

export interface BoardGroup {
  id: string
  name: string
  color: string | null
  position: number
  collapsed: boolean
}

export interface Board {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  type: string
  default_view: string
  position: number
  columns: BoardColumn[]
  groups: BoardGroup[]
}

export function useBoards() {
  const workspace = useAuthStore(s => s.workspace)
  return useQuery({
    queryKey: ['boards', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/boards`)
      return res.data.data as Board[]
    },
    enabled: !!workspace,
  })
}

export function useBoard(boardId: string) {
  const workspace = useAuthStore(s => s.workspace)
  return useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/boards/${boardId}`)
      return res.data.data as Board
    },
    enabled: !!workspace && !!boardId,
  })
}

export function useCreateBoard() {
  const qc        = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (data: Partial<Board>) =>
      api.post(`/workspaces/${workspace!.id}/boards`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards', workspace?.id] }),
  })
}

export function useDeleteBoard() {
  const qc        = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (boardId: string) =>
      api.delete(`/workspaces/${workspace!.id}/boards/${boardId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards', workspace?.id] }),
  })
}

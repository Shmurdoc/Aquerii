import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export interface DocumentFolder {
  id: string
  workspace_id: string
  parent_id: string | null
  created_by: string | null
  name: string
  position: number
  created_at: string
  updated_at: string
}

export function useDocuments() {
  const workspace = useAuthStore((s) => s.workspace)

  return useQuery({
    queryKey: ['documents', workspace?.id],
    queryFn: () => api.get(`/workspaces/${workspace!.id}/documents`).then((r) => r.data.data),
    enabled: !!workspace,
  })
}

export function useDocument(docId: string, workspaceId?: string) {
  const workspace = useAuthStore((s) => s.workspace)
  const wsId = workspaceId ?? workspace?.id
  return useQuery({
    queryKey: ['document', wsId, docId],
    queryFn: () => api.get(`/workspaces/${wsId}/documents/${docId}`).then((r) => r.data.data),
    enabled: !!docId && !!wsId,
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  const workspace = useAuthStore((s) => s.workspace)

  return useMutation({
    mutationFn: (data: { title: string; folder_id?: string }) =>
      api.post(`/workspaces/${workspace!.id}/documents`, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

// ── Document Folders ──────────────────────────────────────────────────────

export function useDocumentFolders() {
  const workspace = useAuthStore((s) => s.workspace)

  return useQuery({
    queryKey: ['document-folders', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/document-folders`)
      return res.data.data as DocumentFolder[]
    },
    enabled: !!workspace,
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  const workspace = useAuthStore((s) => s.workspace)

  return useMutation({
    mutationFn: (data: { name: string; parent_id?: string }) =>
      api.post(`/workspaces/${workspace!.id}/document-folders`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-folders', workspace?.id] })
      toast.success('Folder created.')
    },
    onError: () => toast.error('Failed to create folder.'),
  })
}

export function useRenameFolder() {
  const qc = useQueryClient()
  const workspace = useAuthStore((s) => s.workspace)

  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      api.patch(`/workspaces/${workspace!.id}/document-folders/${folderId}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-folders', workspace?.id] })
      toast.success('Folder renamed.')
    },
    onError: () => toast.error('Failed to rename folder.'),
  })
}

export function useDeleteFolder() {
  const qc = useQueryClient()
  const workspace = useAuthStore((s) => s.workspace)

  return useMutation({
    mutationFn: (folderId: string) =>
      api.delete(`/workspaces/${workspace!.id}/document-folders/${folderId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-folders', workspace?.id] })
      qc.invalidateQueries({ queryKey: ['documents', workspace?.id] })
      toast.success('Folder deleted.')
    },
    onError: () => toast.error('Failed to delete folder.'),
  })
}

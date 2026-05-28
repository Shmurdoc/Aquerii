import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function useDocuments() {
  const workspace = useAuthStore((s) => s.workspace)

  return useQuery({
    queryKey: ['documents', workspace?.id],
    queryFn: () => api.get(`/workspaces/${workspace!.id}/documents`).then((r) => r.data.data),
    enabled: !!workspace,
  })
}

export function useDocument(docId: string) {
  return useQuery({
    queryKey: ['document', docId],
    queryFn: () => api.get(`/documents/${docId}`).then((r) => r.data.data),
    enabled: !!docId,
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

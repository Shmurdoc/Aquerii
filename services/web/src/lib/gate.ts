import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  return workspace.id
}

export interface GateScanRequest {
  badge_id: string
}

export interface GateScanResult {
  status: 'compliant' | 'non_compliant'
  worker: {
    id: string
    name: string
    badge_id: string | null
    avatar_url: string | null
  } | null
  non_compliance_reasons: string[]
  scanned_at: string
}

export function useGateScan() {
  return useMutation({
    mutationFn: async (payload: GateScanRequest) => {
      const res = await api.post(`/workspaces/${wid()}/gate/scan`, payload)
      return res.data.data as GateScanResult
    },
  })
}

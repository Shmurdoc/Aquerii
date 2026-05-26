import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { erpAutomations, Automation, AutomationTemplate, AutomationRun, TriggerConfig, Action } from '@/lib/automation'
import toast from 'react-hot-toast'

export function useAutomations() {
  return useQuery<Automation[]>({
    queryKey: ['automations'],
    queryFn: () => erpAutomations.list(),
    staleTime: 30_000,
  })
}

export function useCreateAutomation() {
  const qc = useQueryClient()
  return useMutation<{ id: string }, Error, { name: string; trigger: TriggerConfig; actions: Action[]; enabled?: boolean }>({
    mutationFn: (payload) => erpAutomations.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] })
      toast.success('Rule created')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateAutomation() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; payload: { name?: string; trigger?: TriggerConfig; actions?: Action[]; enabled?: boolean } }>({
    mutationFn: ({ id, payload }) => erpAutomations.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] })
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteAutomation() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => erpAutomations.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] })
      toast.success('Rule deleted')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useAutomationTemplates(category?: string) {
  return useQuery<AutomationTemplate[]>({
    queryKey: ['automation-templates', category],
    queryFn: () => erpAutomations.templates(category),
    staleTime: 300_000, // templates rarely change
  })
}

export function useAutomationRuns(automationId: string | null) {
  return useQuery<AutomationRun[]>({
    queryKey: ['automation-runs', automationId],
    queryFn: () => erpAutomations.runs(automationId!),
    enabled: !!automationId,
    staleTime: 10_000,
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { erpJobCards, JobCard, CreateJobCardPayload, UpdateJobCardPayload } from '@/lib/erp'
import toast from 'react-hot-toast'

export function useJobCards(params?: { status?: string; priority?: string; assigned_to?: string; search?: string }) {
  return useQuery<JobCard[]>({
    queryKey: ['job-cards', params],
    queryFn: () => erpJobCards.list(params),
    staleTime: 30_000,
  })
}

export function useJobCard(id: string) {
  return useQuery<JobCard>({
    queryKey: ['job-cards', id],
    queryFn: () => erpJobCards.get(id),
    enabled: !!id,
  })
}

export function useCreateJobCard() {
  const qc = useQueryClient()
  return useMutation<JobCard, Error, CreateJobCardPayload>({
    mutationFn: (payload) => erpJobCards.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-cards'] })
      toast.success('Job card created')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateJobCard() {
  const qc = useQueryClient()
  return useMutation<JobCard, Error, { id: string; payload: UpdateJobCardPayload }>({
    mutationFn: ({ id, payload }) => erpJobCards.update(id, payload),
    onSuccess: (card) => {
      qc.setQueryData(['job-cards', card.id], card)
      qc.invalidateQueries({ queryKey: ['job-cards'] })
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteJobCard() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => erpJobCards.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-cards'] })
      toast.success('Job card deleted')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useSignOffJobCard() {
  const qc = useQueryClient()
  return useMutation<JobCard, Error, { id: string; notes?: string }>({
    mutationFn: ({ id, notes }) => erpJobCards.signOff(id, notes),
    onSuccess: (card) => {
      qc.setQueryData(['job-cards', card.id], card)
      qc.invalidateQueries({ queryKey: ['job-cards'] })
      toast.success('Job card signed off')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useRejectJobCard() {
  const qc = useQueryClient()
  return useMutation<JobCard, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => erpJobCards.reject(id, reason),
    onSuccess: (card) => {
      qc.setQueryData(['job-cards', card.id], card)
      qc.invalidateQueries({ queryKey: ['job-cards'] })
    },
    onError: (e) => toast.error(e.message),
  })
}

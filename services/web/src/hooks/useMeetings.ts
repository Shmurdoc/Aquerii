import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { meetingsApi, Meeting, CreateMeetingPayload, UpdateMeetingPayload, AttendeeStatus } from '@/lib/meetings'
import toast from 'react-hot-toast'

export function useMeetings(params?: { from?: string; to?: string; status?: string }) {
  return useQuery<Meeting[]>({
    queryKey: ['meetings', params],
    queryFn: () => meetingsApi.list(params),
    staleTime: 30_000,
  })
}

export function useMeeting(id: string) {
  return useQuery<Meeting>({
    queryKey: ['meetings', id],
    queryFn: () => meetingsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateMeeting() {
  const qc = useQueryClient()
  return useMutation<Meeting, Error, CreateMeetingPayload>({
    mutationFn: (payload) => meetingsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      toast.success('Meeting created')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateMeeting() {
  const qc = useQueryClient()
  return useMutation<Meeting, Error, { id: string; payload: UpdateMeetingPayload }>({
    mutationFn: ({ id, payload }) => meetingsApi.update(id, payload),
    onSuccess: (meeting) => {
      qc.setQueryData(['meetings', meeting.id], meeting)
      qc.invalidateQueries({ queryKey: ['meetings'] })
      toast.success('Meeting updated')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteMeeting() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => meetingsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      toast.success('Meeting cancelled')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateAttendance() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; status: AttendeeStatus }>({
    mutationFn: ({ id, status }) => meetingsApi.updateAttendance(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      toast.success('RSVP updated')
    },
    onError: (e) => toast.error(e.message),
  })
}

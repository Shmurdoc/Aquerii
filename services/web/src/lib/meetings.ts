import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  return workspace.id
}

export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
export type AttendeeStatus = 'pending' | 'accepted' | 'declined' | 'tentative'
export type MeetingProvider = 'zoom' | 'teams' | 'google' | 'other'

export interface MeetingAttendee {
  id: string
  meeting_id: string
  user_id: string | null
  email: string
  name: string | null
  status: AttendeeStatus
  required: boolean
  responded_at: string | null
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  workspace_id: string
  title: string
  description: string | null
  location: string | null
  meeting_url: string | null
  starts_at: string
  ends_at: string
  status: MeetingStatus
  organizer_id: string
  provider: MeetingProvider
  provider_meeting_id: string | null
  recurrence_rule: string | null
  parent_meeting_id: string | null
  settings: Record<string, unknown> | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  organizer?: { id: string; name: string; email?: string }
  attendees?: MeetingAttendee[]
}

export interface CreateMeetingPayload {
  title: string
  description?: string
  location?: string
  meeting_url?: string
  starts_at: string
  ends_at: string
  provider?: MeetingProvider
  recurrence_rule?: string
  settings?: Record<string, unknown>
  attendees?: { email: string; name?: string; required?: boolean }[]
}

export interface UpdateMeetingPayload {
  title?: string
  description?: string | null
  location?: string | null
  meeting_url?: string | null
  starts_at?: string
  ends_at?: string
  status?: MeetingStatus
  settings?: Record<string, unknown> | null
}

export const meetingsApi = {
  list: async (params?: { from?: string; to?: string; status?: string }): Promise<Meeting[]> => {
    const res = await api.get(`/workspaces/${wid()}/meetings`, { params })
    return res.data?.meetings ?? []
  },

  get: async (id: string): Promise<Meeting> => {
    const res = await api.get(`/workspaces/${wid()}/meetings/${id}`)
    return res.data?.meeting
  },

  create: async (payload: CreateMeetingPayload): Promise<Meeting> => {
    const res = await api.post(`/workspaces/${wid()}/meetings`, payload)
    return res.data?.meeting
  },

  update: async (id: string, payload: UpdateMeetingPayload): Promise<Meeting> => {
    const res = await api.patch(`/workspaces/${wid()}/meetings/${id}`, payload)
    return res.data?.meeting
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/meetings/${id}`)
  },

  updateAttendance: async (id: string, status: AttendeeStatus): Promise<void> => {
    await api.patch(`/workspaces/${wid()}/meetings/${id}/attendance`, { status })
  },
}

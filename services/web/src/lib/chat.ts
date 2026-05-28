import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'

export interface ChatChannel {
  id: string
  workspace_id: string
  name: string | null
  type: 'dm' | 'group' | 'channel'
  created_by: string | null
  description: string | null
  is_archived: boolean
  participants: ChatParticipant[]
  creator?: { id: string; name: string }
  messages_count?: number
  updated_at: string
  created_at: string
}

export interface ChatParticipant {
  id: string
  channel_id: string
  user_id: string
  last_read_at: string | null
  is_muted: boolean
  user?: { id: string; name: string }
}

export interface ChatMessage {
  id: string
  channel_id: string
  user_id: string
  body: string
  attachments: Record<string, unknown>[]
  reply_to: string | null
  is_edited: boolean
  is_deleted: boolean
  user?: { id: string; name: string }
  created_at: string
  updated_at: string
}

function wk(w: string | undefined) { return ['chat', w] as const }

export function useChatChannels(w: string | undefined) {
  return useQuery<{ data: ChatChannel[] }>({
    queryKey: [...wk(w), 'channels'],
    queryFn: () => api.get(`/workspaces/${w}/chat/channels`).then(r => r.data),
    enabled: !!w,
  })
}

export function useChatChannel(w: string | undefined, id: string | null) {
  return useQuery<{ data: ChatChannel }>({
    queryKey: [...wk(w), 'channel', id],
    queryFn: () => api.get(`/workspaces/${w}/chat/channels/${id}`).then(r => r.data),
    enabled: !!w && !!id,
  })
}

export function useCreateChatChannel(w: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/workspaces/${w}/chat/channels`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [...wk(w), 'channels'] }) },
  })
}

export function useChatMessages(w: string | undefined, channelId: string | null) {
  return useQuery<{ data: ChatMessage[] }>({
    queryKey: [...wk(w), 'messages', channelId],
    queryFn: () => api.get(`/workspaces/${w}/chat/channels/${channelId}/messages`).then(r => r.data),
    enabled: !!w && !!channelId,
  })
}

export function sendChatMessage(channelId: string, body: string, replyTo?: string) {
  const socket = getSocket()
  const tempId = crypto.randomUUID()
  socket.emit('chat:message:send', { channelId, body, replyTo, tempId })
  return tempId
}

export function joinChatChannel(channelId: string) {
  getSocket().emit('chat:join', { channelId })
}

export function leaveChatChannel(channelId: string) {
  getSocket().emit('chat:leave', { channelId })
}

export function sendTypingIndicator(channelId: string) {
  getSocket().emit('chat:typing', { channelId })
}

export function markChatRead(channelId: string) {
  getSocket().emit('chat:read', { channelId })
}

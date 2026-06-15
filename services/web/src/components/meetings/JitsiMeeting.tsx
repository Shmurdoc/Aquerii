import { useQuery } from '@tanstack/react-query'
import { JitsiMeeting as JitsiMeetingSDK } from '@jitsi/react-sdk'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { Loader2 } from 'lucide-react'

interface JitsiTokenResponse {
  jwt: string
  room: string
  domain: string
  expires_at: string
}

async function fetchJitsiToken(meetingId: string): Promise<JitsiTokenResponse> {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  const res = await api.post<{ data: JitsiTokenResponse }>(
    `/workspaces/${workspace.id}/meetings/${meetingId}/jitsi-token`,
  )
  return res.data.data
}

export function useJitsiJwt(meetingId: string) {
  return useQuery<JitsiTokenResponse>({
    queryKey: ['jitsi-token', meetingId],
    queryFn: () => fetchJitsiToken(meetingId),
    enabled: !!meetingId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

interface Props {
  meetingId: string
  roomName?: string
  displayName: string
  email?: string
  onEnd?: () => void
}

export function JitsiMeeting({ meetingId, roomName, displayName, email, onEnd }: Props) {
  const { data, isLoading, isError, error, refetch } = useJitsiJwt(meetingId)

  if (isLoading) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-[#1a1a2e] rounded-xl">
        <Loader2 className="h-10 w-10 text-white animate-spin mb-3" />
        <p className="text-white text-sm">Requesting meeting access…</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-[#1a1a2e] rounded-xl gap-3 p-6 text-center">
        <p className="text-white text-sm">Could not start the meeting.</p>
        <p className="text-white/60 text-xs">{(error as Error)?.message ?? 'Unknown error'}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-[#1a1a2e] rounded-xl overflow-hidden">
      <JitsiMeetingSDK
        domain={data.domain}
        roomName={roomName ?? data.room}
        jwt={data.jwt}
        userInfo={{
          displayName,
          email: email ?? '',
        }}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          toolbarButtons: [
            'microphone', 'camera', 'desktop', 'chat',
            'raisehand', 'participants-pane', 'tileview',
          ],
        }}
        interfaceConfigOverwrite={{
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_ALWAYS_VISIBLE: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        onReadyToClose={() => onEnd?.()}
        getIFrameRef={(iframeRef: HTMLIFrameElement) => {
          if (iframeRef) iframeRef.style.height = '100%'
        }}
      />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Video, PhoneOff, Mic, MicOff, VideoIcon, Monitor, Settings, Users } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  roomName: string
  displayName: string
  email?: string
  onEnd?: () => void
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      executeCommand: (command: string, ...args: unknown[]) => void
      addEventListener: (event: string, handler: (data: Record<string, unknown>) => void) => void
      dispose: () => void
    }
  }
}

const JITSI_DOMAIN = 'meet.jit.si'

export function JitsiMeeting({ roomName, displayName, email, onEnd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<{ executeCommand: (command: string, ...args: unknown[]) => void; addEventListener: (event: string, handler: (data: Record<string, unknown>) => void) => void; dispose: () => void } | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    // Load Jitsi Meet External API script
    const script = document.createElement('script')
    script.src = `https://${JITSI_DOMAIN}/external_api.js`
    script.async = true
    script.onload = () => {
      if (!window.JitsiMeetExternalAPI || !containerRef.current) return

      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        parentNode: containerRef.current,
        roomName,
        userInfo: {
          displayName,
          email,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          disableShortPoll: true,
          prejoinPageEnabled: false,
          toolbarButtons: [
            'microphone', 'camera', 'desktop', 'chat',
            'raisehand', 'participants-pane', 'tileview',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          DEFAULT_BACKGROUND: '#1a1a2e',
          TOOLBAR_ALWAYS_VISIBLE: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        },
      })

      api.addEventListener('readyToClose', () => {
        onEnd?.()
      })

      api.addEventListener('participantJoined', () => {
        setParticipantCount(prev => prev + 1)
      })

      api.addEventListener('participantLeft', () => {
        setParticipantCount(prev => Math.max(0, prev - 1))
      })

      apiRef.current = api
      setIsLoaded(true)
    }

    document.head.appendChild(script)

    return () => {
      apiRef.current?.dispose()
      document.head.removeChild(script)
    }
  }, [roomName, displayName, email, onEnd])

  const toggleMute = () => {
    apiRef.current?.executeCommand('toggleAudio')
    setIsMuted(v => !v)
  }

  const toggleVideo = () => {
    apiRef.current?.executeCommand('toggleVideo')
    setIsVideoOff(v => !v)
  }

  const shareScreen = () => {
    apiRef.current?.executeCommand('toggleShareScreen')
  }

  const endCall = () => {
    apiRef.current?.dispose()
    onEnd?.()
  }

  return (
    <div className="relative h-full w-full bg-[#1a1a2e] rounded-xl overflow-hidden">
      {/* Jitsi container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a2e]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4" />
          <p className="text-white text-sm">Connecting to meeting…</p>
        </div>
      )}

      {/* Custom controls overlay */}
      {isLoaded && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button
            onClick={toggleMute}
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
              isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30',
            )}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            onClick={toggleVideo}
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
              isVideoOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30',
            )}
          >
            {isVideoOff ? <VideoIcon size={20} /> : <Video size={20} />}
          </button>

          <button
            onClick={shareScreen}
            className="w-12 h-12 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <Monitor size={20} />
          </button>

          <button
            onClick={endCall}
            className="w-12 h-12 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-colors"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      )}

      {/* Participant count */}
      {isLoaded && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
          <Users size={14} className="text-white" />
          <span className="text-white text-xs font-medium">{participantCount + 1}</span>
        </div>
      )}

      {/* Room name */}
      <div className="absolute top-4 left-4 bg-black/50 px-3 py-1.5 rounded-full">
        <span className="text-white text-xs font-medium">{roomName}</span>
      </div>
    </div>
  )
}

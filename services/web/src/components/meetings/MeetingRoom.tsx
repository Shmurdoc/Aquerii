import { useState } from 'react'
import { JitsiMeeting } from './JitsiMeeting'
import { Video, ExternalLink, X, Monitor } from 'lucide-react'
import { Button } from '@/components/ui'
import clsx from 'clsx'

interface Meeting {
  id: string
  title: string
  provider: string
  meeting_url: string | null
  provider_meeting_id: string | null
}

interface Props {
  meeting: Meeting
  userName: string
  userEmail?: string
  onClose: () => void
}

type ProviderConfig = {
  name: string
  icon: string
  color: string
  joinType: 'iframe' | 'deep_link'
  getJoinUrl?: (meeting: Meeting) => string
  getRoomName?: (meeting: Meeting) => string
}

const PROVIDERS: Record<string, ProviderConfig> = {
  jitsi: {
    name: 'Jitsi Meet',
    icon: '📹',
    color: 'bg-purple-500/20 text-purple-400',
    joinType: 'iframe',
    getRoomName: (m) => m.provider_meeting_id ?? `aquerii-${m.id}`,
  },
  zoom: {
    name: 'Zoom',
    icon: '🔵',
    color: 'bg-blue-500/20 text-blue-400',
    joinType: 'deep_link',
    getJoinUrl: (m) => m.meeting_url ?? '',
  },
  teams: {
    name: 'Microsoft Teams',
    icon: '🟣',
    color: 'bg-indigo-500/20 text-indigo-400',
    joinType: 'deep_link',
    getJoinUrl: (m) => m.meeting_url ?? '',
  },
  google: {
    name: 'Google Meet',
    icon: '🟢',
    color: 'bg-green-500/20 text-green-400',
    joinType: 'deep_link',
    getJoinUrl: (m) => m.meeting_url ?? '',
  },
  other: {
    name: 'Other',
    icon: '🔗',
    color: 'bg-gray-500/20 text-gray-400',
    joinType: 'deep_link',
    getJoinUrl: (m) => m.meeting_url ?? '',
  },
}

export function MeetingRoom({ meeting, userName, userEmail, onClose }: Props) {
  const [activeProvider, setActiveProvider] = useState(meeting.provider)

  const provider = PROVIDERS[activeProvider] ?? PROVIDERS.other

  // Jitsi iframe mode
  if (provider.joinType === 'iframe') {
    const roomName = provider.getRoomName?.(meeting) ?? meeting.id

    return (
      <div className="fixed inset-0 z-50 bg-black">
        <JitsiMeeting
          roomName={roomName}
          displayName={userName}
          email={userEmail}
          onEnd={onClose}
        />
      </div>
    )
  }

  // Deep link mode (Zoom, Teams, Meet, etc.)
  const joinUrl = provider.getJoinUrl?.(meeting)

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[var(--color-bg-surface)] rounded-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Join Meeting</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={20} />
          </button>
        </div>

        {/* Meeting info */}
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center text-lg', provider.color)}>
              {provider.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{meeting.title}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{provider.name}</p>
            </div>
          </div>

          {/* Provider switcher */}
          <div className="flex gap-2">
            {Object.entries(PROVIDERS).filter(([key]) => key !== 'other').map(([key, p]) => (
              <button
                key={key}
                onClick={() => setActiveProvider(key)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  activeProvider === key
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {p.icon} {p.name}
              </button>
            ))}
          </div>

          {/* Meeting URL display */}
          {joinUrl && (
            <div className="bg-[var(--color-bg-hover)] rounded-lg p-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Meeting link</p>
              <p className="text-sm text-[var(--color-text-primary)] break-all font-mono">{joinUrl}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-[var(--color-glass-border)] flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          {joinUrl ? (
            <Button
              onClick={() => window.open(joinUrl, '_blank')}
              className="flex-1 gap-2"
            >
              <ExternalLink size={14} /> Join Meeting
            </Button>
          ) : (
            <Button disabled className="flex-1 gap-2">
              <Video size={14} /> No meeting link
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

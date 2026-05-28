import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  useChatChannels,
  useChatMessages,
  useCreateChatChannel,
  sendChatMessage,
  joinChatChannel,
  leaveChatChannel,
  sendTypingIndicator,
  markChatRead,
  type ChatChannel,
  type ChatMessage,
} from '@/lib/chat'
import { getSocket } from '@/lib/socket'
import { Hash, Plus, Send, ArrowLeft, Users } from 'lucide-react'
import clsx from 'clsx'
import { Button, Input } from '@/components/ui'

export default function ChatPage() {
  const workspace = useAuthStore(s => s.workspace)
  const user = useAuthStore(s => s.user)
  const wid = workspace?.id ?? ''
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')

  const { data: channelsData } = useChatChannels(wid)
  const channels = channelsData?.data ?? []

  const createChannel = useCreateChatChannel(wid)

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return
    createChannel.mutate(
      { name: newChannelName, type: 'channel', participant_ids: [user?.id].filter(Boolean) },
      {
        onSuccess: (res) => {
          setActiveChannelId(res.data.data.id)
          setNewChannelName('')
          setShowNewChannel(false)
        },
      },
    )
  }

  const activeChannel = channels.find(c => c.id === activeChannelId)

  return (
    <div className="flex h-full">
      {/* Channel list */}
      <div
        className={clsx(
          'flex flex-col border-r border-[var(--color-glass-border)] bg-[var(--color-bg-base)]',
          activeChannelId ? 'hidden md:flex' : 'flex',
          'w-full md:w-72 shrink-0',
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-glass-border)]">
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Chat</h1>
          <button
            onClick={() => setShowNewChannel(v => !v)}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {showNewChannel && (
          <div className="px-3 py-2 border-b border-[var(--color-glass-border)]">
            <div className="flex gap-2">
              <Input
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                placeholder="Channel name"
                containerClassName="!mb-0 flex-1"
                className="!text-xs"
                onKeyDown={e => e.key === 'Enter' && handleCreateChannel()}
              />
              <Button size="sm" onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
                Create
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {channels.map(channel => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              isActive={channel.id === activeChannelId}
              currentUserId={user?.id}
              onClick={() => setActiveChannelId(channel.id)}
            />
          ))}
          {channels.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
              No channels yet. Create one to start chatting.
            </div>
          )}
        </div>
      </div>

      {/* Message area */}
      <div className={clsx('flex-1 flex flex-col min-w-0', !activeChannelId && 'hidden md:flex')}>
        {activeChannel ? (
          <MessageArea
            channel={activeChannel}
            currentUserId={user?.id}
            onBack={() => setActiveChannelId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
            <div className="text-center">
              <Hash size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChannelRow({
  channel,
  isActive,
  currentUserId,
  onClick,
}: {
  channel: ChatChannel
  isActive: boolean
  currentUserId?: string
  onClick: () => void
}) {
  const otherParticipant = channel.type === 'dm'
    ? channel.participants.find(p => p.user_id !== currentUserId)?.user
    : null

  const displayName = channel.name ?? otherParticipant?.name ?? 'Unknown'

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
        isActive
          ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
      )}
    >
      <Hash size={14} className="shrink-0" />
      <span className="text-sm font-medium truncate">{displayName}</span>
      {channel.type === 'channel' && (
        <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
          {channel.participants.length}
        </span>
      )}
    </button>
  )
}

function MessageArea({
  channel,
  currentUserId,
  onBack,
}: {
  channel: ChatChannel
  currentUserId?: string
  onBack: () => void
}) {
  const { data: messagesData, refetch } = useChatMessages(
    useAuthStore.getState().workspace?.id,
    channel.id,
  )
  const messages = messagesData?.data ?? []
  const [input, setInput] = useState('')
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    joinChatChannel(channel.id)
    markChatRead(channel.id)
    return () => { leaveChatChannel(channel.id) }
  }, [channel.id])

  useEffect(() => {
    const socket = getSocket()

    const handleNewMessage = (msg: ChatMessage) => {
      if (msg.channel_id === channel.id) {
        refetch()
        markChatRead(channel.id)
      }
    }

    const handleTyping = (data: { channelId: string; userId: string; userName: string }) => {
      if (data.channelId === channel.id && data.userId !== currentUserId) {
        setTypingUsers(prev => {
          if (prev.includes(data.userName)) return prev
          return [...prev, data.userName]
        })
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(n => n !== data.userName))
        }, 3000)
      }
    }

    socket.on('chat:message:new', handleNewMessage)
    socket.on('chat:typing', handleTyping)

    return () => {
      socket.off('chat:message:new', handleNewMessage)
      socket.off('chat:typing', handleTyping)
    }
  }, [channel.id, currentUserId, refetch])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    sendChatMessage(channel.id, input.trim())
    setInput('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    sendTypingIndicator(channel.id)
  }

  const channelName = channel.name ?? 'Direct Message'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-glass-border)] shrink-0">
        <button onClick={onBack} className="md:hidden p-1 text-[var(--color-text-muted)]">
          <ArrowLeft size={18} />
        </button>
        <Hash size={16} className="text-[var(--color-accent-text)]" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{channelName}</h2>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {channel.participants.length} members
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.user_id === currentUserId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[10px] text-[var(--color-text-muted)]">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--color-glass-border)] shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Message #${channelName}`}
            containerClassName="!mb-0 flex-1"
          />
          <Button size="sm" onClick={handleSend} disabled={!input.trim()} iconOnly>
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={clsx('flex gap-2', isOwn && 'flex-row-reverse')}>
      <div className="w-7 h-7 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent-text)] text-[10px] font-bold shrink-0">
        {message.user?.name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className={clsx('max-w-[70%]', isOwn && 'text-right')}>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">
          {message.user?.name ?? 'Unknown'}
        </p>
        <div
          className={clsx(
            'px-3 py-2 rounded-xl text-sm',
            isOwn
              ? 'bg-[var(--color-accent)] text-white rounded-tr-sm'
              : 'bg-[var(--color-glass-bg)] text-[var(--color-text-primary)] rounded-tl-sm border border-[var(--color-glass-border)]',
          )}
        >
          <p className="whitespace-pre-wrap">{message.body}</p>
        </div>
        <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import {
  useChatChannels,
  useChatMessages,
  useCreateChatChannel,
  sendChatMessage,
  joinChatChannel,
  leaveChatChannel,
  sendTypingIndicator,
  markChatRead,
  type ChatAttachment,
  type ChatAttachmentType,
  type ChatChannel,
  type ChatMessage,
} from '@/lib/chat'
import { getSocket } from '@/lib/socket'
import { useWorkspaceMembers } from '@/hooks/useSettings'
import { useBoards } from '@/hooks/useBoards'
import { useDocuments } from '@/hooks/useDocuments'
import { Hash, Plus, Send, ArrowLeft, Paperclip, Reply, X } from 'lucide-react'
import clsx from 'clsx'
import { Button, Input } from '@/components/ui'

type SearchEntity = {
  id: string
  title: string
  subtitle?: string
  type?: string
  to?: string
}

const ATTACHMENT_TYPES: Array<{ value: ChatAttachmentType; label: string }> = [
  { value: 'task', label: 'Task' },
  { value: 'activity', label: 'Activity' },
  { value: 'whiteboard', label: 'Whiteboard' },
  { value: 'document', label: 'Document' },
  { value: 'link', label: 'Link' },
  { value: 'file', label: 'File Link' },
]

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
      { name: newChannelName, type: 'group', participant_ids: [user?.id].filter(Boolean) },
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
                placeholder="Group name"
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

      <div className={clsx('flex-1 flex flex-col min-w-0', !activeChannelId && 'hidden md:flex')}>
        {activeChannel ? (
          <MessageArea
            workspaceId={wid}
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
      {channel.type !== 'dm' && (
        <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
          {channel.participants.length}
        </span>
      )}
    </button>
  )
}

function MessageArea({
  workspaceId,
  channel,
  currentUserId,
  onBack,
}: {
  workspaceId: string
  channel: ChatChannel
  currentUserId?: string
  onBack: () => void
}) {
  const { data: messagesData, refetch } = useChatMessages(workspaceId, channel.id)
  const messages = messagesData?.data ?? []
  const [input, setInput] = useState('')
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([])
  const [showAttachPanel, setShowAttachPanel] = useState(false)
  const [attachType, setAttachType] = useState<ChatAttachmentType>('task')
  const [attachQuery, setAttachQuery] = useState('')
  const [selectedMentionIds, setSelectedMentionIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: membersData } = useWorkspaceMembers()
  const members = membersData ?? []
  const { data: boards = [] } = useBoards()
  const { data: documents = [] } = useDocuments()

  const mentionMatch = input.match(/(^|\s)@([^\s@]*)$/)
  const mentionQuery = mentionMatch?.[2] ?? null

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return members
      .filter(m => m.user_id !== currentUserId)
      .filter(m => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 6)
  }, [mentionQuery, members, currentUserId])

  const { data: searchData } = useQuery<{ data: SearchEntity[] }>({
    queryKey: ['workspace-search', workspaceId, attachType, attachQuery],
    queryFn: () => api.get(`/workspaces/${workspaceId}/search`, { params: { q: attachQuery } }).then(r => r.data),
    enabled: (attachType === 'task' || attachType === 'activity') && attachQuery.trim().length >= 2,
  })

  const searchItems = useMemo(() => {
    const data = searchData?.data ?? []
    if (attachType === 'task') return data.filter(d => d.type === 'item').slice(0, 8)
    if (attachType === 'activity') return data.slice(0, 8)
    return []
  }, [searchData, attachType])

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

  const addAttachment = (attachment: ChatAttachment) => {
    setPendingAttachments(prev => {
      const exists = prev.some(a => a.type === attachment.type && a.id === attachment.id && a.url === attachment.url)
      if (exists) return prev
      return [...prev, attachment]
    })
  }

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text && pendingAttachments.length === 0) return

    sendChatMessage(channel.id, text, {
      replyTo: replyTarget?.id,
      attachments: pendingAttachments,
      mentionUserIds: Array.from(selectedMentionIds),
    })

    setInput('')
    setReplyTarget(null)
    setPendingAttachments([])
    setSelectedMentionIds(new Set())
    setAttachQuery('')
  }

  const insertMention = (userId: string, userName: string) => {
    setInput(prev => prev.replace(/(^|\s)@([^\s@]*)$/, `$1@${userName} `))
    setSelectedMentionIds(prev => new Set(prev).add(userId))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    sendTypingIndicator(channel.id)
  }

  const channelName = channel.name ?? 'Direct Message'

  return (
    <div className="flex flex-col h-full">
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

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.user_id === currentUserId}
            onReply={() => setReplyTarget(msg)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[10px] text-[var(--color-text-muted)]">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      <div className="px-4 py-3 border-t border-[var(--color-glass-border)] shrink-0 space-y-2">
        {replyTarget && (
          <div className="flex items-start justify-between gap-2 rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-bg-hover)] px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] text-[var(--color-text-muted)]">Replying to {replyTarget.user?.name ?? 'message'}</p>
              <p className="text-xs text-[var(--color-text-primary)] truncate">{replyTarget.body || 'Attachment message'}</p>
            </div>
            <button onClick={() => setReplyTarget(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <X size={14} />
            </button>
          </div>
        )}

        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingAttachments.map((att, idx) => (
              <span key={`${att.type}-${att.id ?? att.url ?? idx}`} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-glass-border)] bg-[var(--color-bg-hover)] px-2 py-0.5 text-[10px] text-[var(--color-text-primary)]">
                {attachmentLabel(att)}
                <button className="text-[var(--color-text-muted)]" onClick={() => removeAttachment(idx)}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {showAttachPanel && (
          <div className="rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-bg-hover)] p-2 space-y-2">
            <div className="flex gap-2 items-center">
              <select
                className="h-8 rounded border border-[var(--color-glass-border)] bg-transparent px-2 text-xs"
                value={attachType}
                onChange={e => {
                  setAttachType(e.target.value as ChatAttachmentType)
                  setAttachQuery('')
                }}
              >
                {ATTACHMENT_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <Input
                value={attachQuery}
                onChange={e => setAttachQuery(e.target.value)}
                placeholder={`Find ${attachType}`}
                containerClassName="!mb-0 flex-1"
                className="!text-xs"
              />
              <button
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                onClick={() => setShowAttachPanel(false)}
              >
                Close
              </button>
            </div>

            {(attachType === 'task' || attachType === 'activity') && (
              <div className="max-h-28 overflow-y-auto space-y-1">
                {searchItems.map(item => (
                  <button
                    key={`${item.type}-${item.id}`}
                    className="w-full text-left rounded px-2 py-1 hover:bg-[var(--color-bg-base)]"
                    onClick={() => addAttachment({ type: attachType, id: item.id, label: item.title, url: item.to ?? null })}
                  >
                    <p className="text-xs text-[var(--color-text-primary)] truncate">{item.title}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{item.subtitle ?? item.type}</p>
                  </button>
                ))}
              </div>
            )}

            {attachType === 'whiteboard' && (
              <div className="max-h-28 overflow-y-auto space-y-1">
                {boards
                  .filter(b => !attachQuery || b.name.toLowerCase().includes(attachQuery.toLowerCase()))
                  .slice(0, 8)
                  .map(board => (
                    <button
                      key={board.id}
                      className="w-full text-left rounded px-2 py-1 hover:bg-[var(--color-bg-base)]"
                      onClick={() => addAttachment({ type: 'whiteboard', id: board.id, label: board.name, url: `/boards/${board.id}?view=whiteboard` })}
                    >
                      <p className="text-xs text-[var(--color-text-primary)] truncate">{board.name}</p>
                    </button>
                  ))}
              </div>
            )}

            {attachType === 'document' && (
              <div className="max-h-28 overflow-y-auto space-y-1">
                {(documents as Array<{ id: string; title: string }>)
                  .filter(d => !attachQuery || d.title.toLowerCase().includes(attachQuery.toLowerCase()))
                  .slice(0, 8)
                  .map(doc => (
                    <button
                      key={doc.id}
                      className="w-full text-left rounded px-2 py-1 hover:bg-[var(--color-bg-base)]"
                      onClick={() => addAttachment({ type: 'document', id: doc.id, label: doc.title, url: `/documents/${doc.id}` })}
                    >
                      <p className="text-xs text-[var(--color-text-primary)] truncate">{doc.title}</p>
                    </button>
                  ))}
              </div>
            )}

            {(attachType === 'link' || attachType === 'file') && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!attachQuery.trim()) return
                    addAttachment({
                      type: attachType,
                      label: attachQuery.trim(),
                      url: attachQuery.trim(),
                    })
                    setAttachQuery('')
                  }}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="relative flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowAttachPanel(v => !v)} iconOnly>
            <Paperclip size={14} />
          </Button>

          <Input
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Message #${channelName} (@mention, reply, attach tasks/docs/whiteboards)`}
            containerClassName="!mb-0 flex-1"
          />

          <Button size="sm" onClick={handleSend} disabled={!input.trim() && pendingAttachments.length === 0} iconOnly>
            <Send size={14} />
          </Button>

          {mentionCandidates.length > 0 && (
            <div className="absolute left-10 right-10 bottom-10 rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-bg-base)] shadow-lg p-1 z-10">
              {mentionCandidates.map(member => (
                <button
                  key={member.user_id}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[var(--color-bg-hover)]"
                  onClick={() => insertMention(member.user_id, member.name)}
                >
                  <p className="text-xs text-[var(--color-text-primary)]">{member.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{member.email}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isOwn,
  onReply,
}: {
  message: ChatMessage
  isOwn: boolean
  onReply: () => void
}) {
  return (
    <div className={clsx('flex gap-2', isOwn && 'flex-row-reverse')}>
      <div className="w-7 h-7 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent-text)] text-[10px] font-bold shrink-0">
        {message.user?.name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className={clsx('max-w-[78%]', isOwn && 'text-right')}>
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {message.user?.name ?? 'Unknown'}
          </p>
          <button onClick={onReply} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <Reply size={12} />
          </button>
        </div>

        <div
          className={clsx(
            'px-3 py-2 rounded-xl text-sm space-y-1',
            isOwn
              ? 'bg-[var(--color-accent)] text-white rounded-tr-sm'
              : 'bg-[var(--color-glass-bg)] text-[var(--color-text-primary)] rounded-tl-sm border border-[var(--color-glass-border)]',
          )}
        >
          {message.replyTo && (
            <div className={clsx(
              'rounded-md px-2 py-1 text-[10px]',
              isOwn ? 'bg-white/20 text-white/90' : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]',
            )}>
              Replying to: {message.replyTo.body || 'Attachment message'}
            </div>
          )}

          {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}

          {message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {message.attachments.map((att, idx) => (
                <AttachmentChip key={`${att.type}-${att.id ?? att.url ?? idx}`} attachment={att} isOwn={isOwn} />
              ))}
            </div>
          )}
        </div>
        <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function AttachmentChip({ attachment, isOwn }: { attachment: ChatAttachment; isOwn: boolean }) {
  const label = attachmentLabel(attachment)
  const chipClass = clsx(
    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]',
    isOwn ? 'border-white/40 text-white/90' : 'border-[var(--color-glass-border)] text-[var(--color-text-primary)]',
  )

  if (attachment.url) {
    return (
      <a className={chipClass} href={attachment.url} target="_blank" rel="noreferrer">
        {label}
      </a>
    )
  }

  return <span className={chipClass}>{label}</span>
}

function attachmentLabel(attachment: ChatAttachment): string {
  const base = attachment.label || attachment.id || attachment.url || 'attachment'
  return `${attachment.type}: ${base}`
}

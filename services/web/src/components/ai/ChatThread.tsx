import { useRef, useEffect, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Bot, User, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type ChatThreadProps = {
  messages: ChatMessage[]
  isLoading?: boolean
  emptyState?: ReactNode
  className?: string
}

export function ChatThread({ messages, isLoading, emptyState, className }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) } catch {}
  }, [messages, isLoading])

  return (
    <div className={clsx('flex-1 overflow-y-auto space-y-4', className)}>
      {messages.length === 0 && emptyState ? (
        emptyState
      ) : (
        messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            {msg.role === 'assistant' && (
              <Avatar
                name="AI"
                color="bg-[var(--color-accent)]"
                size="sm"
                className="mt-0.5"
              />
            )}
            <div
              className={clsx(
                'max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
                msg.role === 'user'
                  ? 'bg-[var(--color-accent)] text-white rounded-br-md'
                  : 'bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] text-[var(--color-text-primary)] rounded-bl-md',
              )}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))
      )}

      {isLoading && (
        <div className="flex gap-3">
          <Avatar
            name="AI"
            color="bg-[var(--color-accent)]"
            size="sm"
          />
          <div className="max-w-[75%] rounded-xl rounded-bl-md px-4 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)]">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

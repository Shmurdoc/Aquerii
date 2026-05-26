import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { AI_CREDIT_COSTS } from '@/lib/aiCosts'
import { Send, Bot, User, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIChatPage() {
  const workspace = useAuthStore(s => s.workspace)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: credits } = useQuery({
    queryKey: ['ai-credits', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/ai/credits`)
      return res.data.data as { used: number; limit: number; remaining: number }
    },
    enabled: !!workspace,
    refetchInterval: 30_000,
  })

  const chat = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post(`/workspaces/${workspace!.id}/ai/chat`, {
        message,
        history: messages.map(m => ({ role: m.role, content: m.content })),
      })
      return res.data.data as { response: string }
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    },
    onError: () => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, the AI service is currently unavailable. Please try again.',
      }])
    },
    onSettled: () => setStreaming(false),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || streaming || chat.isPending) return
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setStreaming(true)
    chat.mutate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestedPrompts = [
    'Summarize my open deals',
    'Help me write a sales email',
    'What tasks are overdue?',
    'Generate a project brief',
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-[var(--color-glass-border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--color-accent-text)]" />
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">AI Assistant</h1>
        </div>
        {credits && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
            {credits.remaining} / {credits.limit} credits
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot size={40} className="text-[var(--color-accent-text)] mb-4" />
            <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-md">
              Ask me anything about your workspace — I can summarize deals, draft emails,
              generate project descriptions, and more.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {suggestedPrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => {
                    setMessages(prev => [...prev, { role: 'user', content: prompt }])
                    setStreaming(true)
                    chat.mutate(prompt)
                  }}
                  disabled={chat.isPending}
                  className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-[var(--color-accent-text)]" />
              </div>
            )}
            <div
              className={clsx(
                'max-w-[70%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[var(--color-accent)] text-white rounded-br-md'
                  : 'bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] text-[var(--color-text-primary)] rounded-bl-md'
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
        ))}

        {streaming && chat.isPending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center shrink-0">
              <Bot size={14} className="text-[var(--color-accent-text)]" />
            </div>
            <div className="max-w-[70%] rounded-xl rounded-bl-md px-4 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)]">
              <Loader2 size={16} className="animate-spin text-[var(--color-text-muted)]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-3 border-t border-[var(--color-glass-border)] shrink-0">
        {credits && credits.remaining <= 10 && credits.remaining > 0 && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-amber-400">
            <AlertCircle size={12} />
            Only {credits.remaining} AI credits remaining
          </div>
        )}
        {credits && credits.remaining <= 0 && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-red-400">
            <AlertCircle size={12} />
            No AI credits left. Upgrade your plan to continue.
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={credits && credits.remaining <= 0 ? 'Out of credits' : 'Ask the AI assistant...'}
            disabled={chat.isPending || (credits !== undefined && credits.remaining <= 0)}
            rows={1}
            className="flex-1 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-40"
            style={{ minHeight: '36px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chat.isPending || (credits !== undefined && credits.remaining <= 0)}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-40 transition-colors shrink-0"
            aria-label="Send message"
          >
            {chat.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
          Costs {AI_CREDIT_COSTS.chat} credit per message
        </p>
      </div>
    </div>
  )
}

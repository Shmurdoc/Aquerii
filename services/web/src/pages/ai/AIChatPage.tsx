import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { AI_CREDIT_COSTS } from '@/lib/aiCosts'
import { ChatInput, ChatThread, SuggestedPrompts, type ChatMessage } from '@/components/ai'
import { EmptyState } from '@/components/ui'
import { Bot, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

const SUGGESTED_PROMPTS = [
  'Summarize my open deals',
  'Help me write a sales email',
  'What tasks are overdue?',
  'Generate a project brief',
]

export default function AIChatPage() {
  const workspace = useAuthStore(s => s.workspace)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)

  const { data: credits, refetch: refetchCredits } = useQuery({
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
    onMutate: () => setStreaming(true),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      setStreaming(false)
      refetchCredits()
    },
    onError: () => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, the AI service is currently unavailable. Please try again.',
      }])
      setStreaming(false)
    },
    onSettled: () => setStreaming(false),
  })

  const handleSend = useCallback((message: string) => {
    if (!message.trim() || streaming || chat.isPending) return
    setMessages(prev => [...prev, { role: 'user', content: message }])
    chat.mutate(message)
  }, [streaming, chat])

  const handleRetryLast = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      setMessages(prev => prev.slice(0, -1))
      setStreaming(true)
      chat.mutate(lastUserMsg.content)
    }
  }, [messages, chat])

  const handlePromptSelect = useCallback((prompt: string) => {
    if (streaming || chat.isPending) return
    setMessages(prev => [...prev, { role: 'user', content: prompt }])
    setStreaming(true)
    chat.mutate(prompt)
  }, [streaming, chat])

  const creditUsage = credits ? (credits.used / credits.limit) * 100 : 0
  const outOfCredits = credits !== undefined && credits.remaining <= 0
  const lowCredits = credits !== undefined && credits.remaining <= 10 && credits.remaining > 0

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-[var(--color-glass-border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--color-accent-text)]" />
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">AI Assistant</h1>
        </div>
        {credits && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span
                className={clsx(
                  'inline-block w-1.5 h-1.5 rounded-full',
                  creditUsage > 85 ? 'bg-red-500' : creditUsage > 60 ? 'bg-amber-400' : 'bg-emerald-500',
                )}
              />
              {credits.remaining} / {credits.limit} credits
            </div>
            <div className="hidden sm:block w-24 h-1.5 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-300',
                  creditUsage > 85 ? 'bg-red-500' : creditUsage > 60 ? 'bg-amber-400' : 'bg-[var(--color-accent)]',
                )}
                style={{ width: `${Math.min(creditUsage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <ChatThread
        messages={messages}
        isLoading={streaming && chat.isPending}
        className="px-6 py-4"
        emptyState={
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-accent-light)]">
              <Bot size={32} className="text-[var(--color-accent-text)]" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
              Ask me anything about your workspace — I can summarize deals, draft emails,
              generate project descriptions, and more.
            </p>
            <SuggestedPrompts
              prompts={SUGGESTED_PROMPTS}
              onSelect={handlePromptSelect}
              disabled={outOfCredits}
            />
          </div>
        }
      />

      {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !streaming && (
        <div className="px-6 pb-1 flex justify-center">
          <button
            onClick={handleRetryLast}
            disabled={chat.isPending}
            className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <RefreshCw size={12} />
            Retry last response
          </button>
        </div>
      )}

      <div className="px-6 py-3 border-t border-[var(--color-glass-border)] shrink-0">
        {lowCredits && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-amber-400">
            <AlertCircle size={12} />
            Only {credits.remaining} AI credits remaining
          </div>
        )}
        {outOfCredits && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-red-400">
            <AlertCircle size={12} />
            No AI credits left. Upgrade your plan to continue.
          </div>
        )}
        <ChatInput
          onSend={handleSend}
          disabled={outOfCredits}
          disabledReason="Out of credits"
          placeholder={outOfCredits ? 'Out of credits' : 'Ask the AI assistant...'}
          isLoading={chat.isPending}
        />
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
          Costs {AI_CREDIT_COSTS.chat} credit per message
        </p>
      </div>
    </div>
  )
}

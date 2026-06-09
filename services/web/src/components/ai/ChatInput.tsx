import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { clsx } from 'clsx'
import { Send, Loader2 } from 'lucide-react'

type ChatInputProps = {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  disabledReason?: string
  isLoading?: boolean
  minRows?: number
  maxRows?: number
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  disabledReason,
  isLoading = false,
  minRows = 1,
  maxRows = 6,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 20
    const padding = 16
    const maxHeight = lineHeight * maxRows + padding
    const newHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${newHeight}px`
  }, [value, maxRows])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled || isLoading) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? (disabledReason ?? placeholder) : placeholder}
        disabled={disabled || isLoading}
        rows={minRows}
        className={clsx(
          'flex-1 rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]',
          'border border-[var(--color-glass-border)] transition-all duration-150',
          'focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]',
          'resize-none px-3 py-2 text-sm leading-5',
          'disabled:opacity-40 disabled:cursor-not-allowed',
        )}
        aria-label="Chat message input"
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled || isLoading}
        className={clsx(
          'h-9 w-9 flex items-center justify-center rounded-lg shrink-0 transition-all duration-150',
          'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1',
        )}
        aria-label="Send message"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
      </button>
    </div>
  )
}

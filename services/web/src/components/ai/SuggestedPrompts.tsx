import { clsx } from 'clsx'

type SuggestedPromptsProps = {
  prompts: string[]
  onSelect: (prompt: string) => void
  disabled?: boolean
  className?: string
}

export function SuggestedPrompts({ prompts, onSelect, disabled, className }: SuggestedPromptsProps) {
  if (prompts.length === 0) return null

  return (
    <div className={clsx('grid grid-cols-2 gap-2 w-full max-w-md', className)}>
      {prompts.map(prompt => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className={clsx(
            'text-xs text-left text-[var(--color-text-muted)]',
            'bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)]',
            'border border-[var(--color-glass-border)] rounded-lg px-3 py-2',
            'transition-colors duration-150',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}

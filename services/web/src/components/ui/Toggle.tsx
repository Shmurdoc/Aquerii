import { clsx } from 'clsx'

type ToggleSize = 'sm' | 'md'
type ToggleColor = 'accent' | 'success' | 'danger'

type ToggleProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  labelPosition?: 'left' | 'right'
  size?: ToggleSize
  color?: ToggleColor
  disabled?: boolean
  className?: string
}

const trackSizes: Record<ToggleSize, string> = {
  sm: 'w-8 h-4',
  md: 'w-10 h-5',
}

const thumbSizes: Record<ToggleSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
}

const colorStyles: Record<ToggleColor, string> = {
  accent: 'bg-[var(--color-accent)]',
  success: 'bg-[var(--color-status-done)]',
  danger: 'bg-[var(--color-status-blocked)]',
}

export function Toggle({ checked = false, onChange, label, labelPosition = 'right', size = 'md', color = 'accent', disabled, className }: ToggleProps) {
  return (
    <label className={clsx(
      'inline-flex items-center gap-2',
      labelPosition === 'left' && 'flex-row-reverse',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      className,
    )}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={clsx(
          'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200',
          trackSizes[size],
          checked ? colorStyles[color] : 'bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)]',
        )}
      >
        <span
          className={clsx(
            'inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200',
            thumbSizes[size],
            checked ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0.5',
          )}
        />
      </button>
      {label && (
        <span className="text-sm text-[var(--color-text-primary)] select-none">{label}</span>
      )}
    </label>
  )
}

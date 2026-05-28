import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type TextareaProps = {
  label?: string
  error?: string
  helperText?: string
  resize?: 'none' | 'vertical' | 'both'
  maxLength?: number
  currentLength?: number
  autoGrow?: boolean
  containerClassName?: string
} & TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, resize = 'vertical', maxLength, currentLength, autoGrow, containerClassName, className, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e)
      if (autoGrow) {
        e.target.style.height = 'auto'
        e.target.style.height = `${e.target.scrollHeight}px`
      }
    }

    return (
      <div className={clsx('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          onChange={handleChange}
          className={clsx(
            'w-full rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]',
            'border border-[var(--color-glass-border)] transition-all duration-150',
            'focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            resize === 'none' && 'resize-none',
            resize === 'vertical' && 'resize-y',
            resize === 'both' && 'resize',
            'p-3 text-sm min-h-[80px]',
            className,
          )}
          aria-invalid={!!error}
          maxLength={maxLength}
          {...props}
        />
        <div className="flex items-center justify-between">
          <div>
            {error && <span className="text-xs text-red-400">{error}</span>}
            {helperText && !error && <span className="text-xs text-[var(--color-text-muted)]">{helperText}</span>}
          </div>
          {maxLength && (
            <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
              {currentLength ?? 0}/{maxLength}
            </span>
          )}
        </div>
      </div>
    )
  },
)

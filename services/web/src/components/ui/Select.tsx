import { forwardRef, type SelectHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

type SelectSize = 'sm' | 'md' | 'lg'

type SelectProps = {
  label?: string
  error?: string
  helperText?: string
  size?: SelectSize
  placeholder?: string
  containerClassName?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>

const sizeStyles: Record<SelectSize, string> = {
  sm: 'h-8 text-xs',
  md: 'h-10 text-sm',
  lg: 'h-12 text-base',
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, size = 'md', placeholder, containerClassName, className, children, ...props }, ref) => {
    return (
      <div className={clsx('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={clsx(
              'w-full rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-primary)]',
              'border border-[var(--color-glass-border)] transition-all duration-150 appearance-none',
              'focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              'pr-10',
              sizeStyles[size],
              className,
            )}
            aria-invalid={!!error}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-[var(--color-bg-base)]">
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown size={size === 'sm' ? 14 : 16} className="text-[var(--color-text-muted)]" />
          </div>
        </div>
        {error && <span className="text-xs text-red-400">{error}</span>}
        {helperText && !error && <span className="text-xs text-[var(--color-text-muted)]">{helperText}</span>}
      </div>
    )
  },
)

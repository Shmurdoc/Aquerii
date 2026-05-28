import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { X, Eye, EyeOff } from 'lucide-react'

type InputSize = 'sm' | 'md' | 'lg'

type InputProps = {
  label?: string
  error?: string
  helperText?: string
  size?: InputSize
  icon?: LucideIcon
  clearable?: boolean
  onClear?: () => void
  containerClassName?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-8 text-xs',
  md: 'h-10 text-sm',
  lg: 'h-12 text-base',
}

const iconSizes: Record<InputSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, size = 'md', icon: Icon, clearable, onClear, containerClassName, className, type, onChange, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const hasValue = value !== undefined && value !== '' && value !== null

    return (
      <div className={clsx('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Icon size={iconSizes[size]} className="text-[var(--color-text-muted)]" />
            </div>
          )}
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            value={value}
            onChange={onChange}
            className={clsx(
              'w-full rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]',
              'border border-[var(--color-glass-border)] transition-all duration-150',
              'focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              Icon && 'pl-10',
              (clearable && hasValue) || isPassword ? 'pr-10' : 'pr-3.5',
              sizeStyles[size],
              className,
            )}
            aria-invalid={!!error}
            {...props}
          />
          <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2.5">
            {clearable && hasValue && !isPassword && (
              <button
                type="button"
                onClick={onClear}
                className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                tabIndex={-1}
              >
                <X size={iconSizes[size]} />
              </button>
            )}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={iconSizes[size]} /> : <Eye size={iconSizes[size]} />}
              </button>
            )}
          </div>
        </div>
        {error && <span className="text-xs text-red-400">{error}</span>}
        {helperText && !error && <span className="text-xs text-[var(--color-text-muted)]">{helperText}</span>}
      </div>
    )
  },
)

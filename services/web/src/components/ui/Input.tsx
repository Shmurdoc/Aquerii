import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

type InputSize = 'sm' | 'md' | 'lg'

type InputProps = {
  label?: string
  error?: string
  helperText?: string
  size?: InputSize
  icon?: LucideIcon
  trailingIcon?: LucideIcon
  clearable?: boolean
  onClear?: () => void
  containerClassName?: string
  hint?: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-8 text-body-sm',
  md: 'h-10 text-body',
  lg: 'h-12 text-body-lg',
}

const iconSizes: Record<InputSize, number> = { sm: 14, md: 16, lg: 18 }
const labelSizeStyles: Record<InputSize, string> = {
  sm: 'text-label',
  md: 'text-body-sm',
  lg: 'text-body',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      hint,
      size = 'md',
      icon: Icon,
      trailingIcon: TrailingIcon,
      clearable,
      onClear,
      containerClassName,
      className,
      type,
      onChange,
      value,
      id,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const autoId = useId()
    const inputId = id ?? autoId
    const isPassword = type === 'password'
    const hasValue = value !== undefined && value !== '' && value !== null
    const invalid = !!error

    return (
      <div className={clsx('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'font-medium text-[var(--color-text-secondary)]',
              labelSizeStyles[size],
            )}
          >
            {label}
          </label>
        )}
        <div
          className={clsx(
            'relative group rounded-md',
            'bg-[var(--color-bg-input)]',
            'border transition-[border-color,box-shadow,background] duration-200 ease-out',
            invalid
              ? 'border-[var(--color-status-blocked)] shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
              : 'border-[var(--color-glass-border)]',
            'focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_var(--color-accent-light)] focus-within:bg-[var(--color-bg-elevated)]',
            'hover:border-[var(--color-glass-border-hover)]',
          )}
        >
          {Icon && (
            <div
              className={clsx(
                'absolute inset-y-0 left-0 flex items-center pointer-events-none',
                size === 'sm' ? 'pl-2.5' : 'pl-3',
              )}
            >
              <Icon
                size={iconSizes[size]}
                className="text-[var(--color-text-muted)] transition-colors group-focus-within:text-[var(--color-accent-text)]"
                aria-hidden="true"
              />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            value={value}
            onChange={onChange}
            className={clsx(
              'peer w-full bg-transparent text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-muted)]',
              'border-0 outline-none rounded-md',
              sizeStyles[size],
              Icon ? (size === 'sm' ? 'pl-8' : 'pl-10') : (size === 'sm' ? 'pl-3' : 'pl-3.5'),
              (clearable && hasValue) || isPassword || TrailingIcon
                ? (size === 'sm' ? 'pr-8' : 'pr-10')
                : (size === 'sm' ? 'pr-3' : 'pr-3.5'),
              className,
            )}
            aria-invalid={invalid}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          <div
            className={clsx(
              'absolute inset-y-0 right-0 flex items-center gap-1',
              size === 'sm' ? 'pr-2' : 'pr-2.5',
            )}
          >
            {clearable && hasValue && !isPassword && (
              <button
                type="button"
                onClick={onClear}
                className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                tabIndex={-1}
                aria-label="Clear input"
              >
                <X size={iconSizes[size]} />
              </button>
            )}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={iconSizes[size]} /> : <Eye size={iconSizes[size]} />}
              </button>
            )}
            {!clearable && !isPassword && TrailingIcon && (
              <TrailingIcon
                size={iconSizes[size]}
                className="text-[var(--color-text-muted)]"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
        {error && (
          <span
            id={`${inputId}-error`}
            className="flex items-center gap-1.5 text-label text-[var(--color-status-blocked)] animate-fade-in"
            role="alert"
          >
            <AlertCircle size={12} aria-hidden="true" />
            {error}
          </span>
        )}
        {helperText && !error && (
          <span
            id={`${inputId}-helper`}
            className="text-label text-[var(--color-text-muted)]"
          >
            {helperText}
          </span>
        )}
        {hint}
      </div>
    )
  },
)

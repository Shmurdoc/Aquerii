import { forwardRef, type ReactNode, type MouseEventHandler } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = {
  as?: 'button' | 'a' | 'div'
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconOnly?: boolean
  fullWidth?: boolean
  disabled?: boolean
  children?: ReactNode
  className?: string
  href?: string
  type?: 'button' | 'submit' | 'reset'
  target?: string
  rel?: string
  onClick?: MouseEventHandler
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm active:bg-[var(--color-accent-hover)]',
  secondary: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-glass-border)] hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)]',
  ghost: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)]',
  danger: 'bg-[var(--color-status-blocked)] text-white hover:opacity-90 active:opacity-80 shadow-sm',
  success: 'bg-[var(--color-status-done)] text-white hover:opacity-90 active:opacity-80 shadow-sm',
  warning: 'bg-[var(--color-status-progress)] text-white hover:opacity-90 active:opacity-80 shadow-sm',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-lg gap-2',
  lg: 'h-11 px-5 text-base rounded-lg gap-2.5',
}

const iconOnlyStyles: Record<ButtonSize, string> = {
  sm: 'w-7 p-0',
  md: 'w-9 p-0',
  lg: 'w-11 p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ as: Tag = 'button', variant = 'primary', size = 'md', loading, iconOnly, fullWidth, disabled, className, children, ...props }, ref) => {
    return (
      <Tag
        ref={ref as any}
        className={clsx(
          'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none select-none',
          variantStyles[variant],
          iconOnly ? iconOnlyStyles[size] : sizeStyles[size],
          loading && 'opacity-70 pointer-events-none',
          fullWidth && 'w-full',
          className,
        )}
        disabled={Tag === 'button' ? (disabled || loading) : undefined}
        aria-disabled={disabled || loading || undefined}
        {...props}
      >
        {loading && <Loader2 size={size === 'sm' ? 12 : 16} className="animate-spin shrink-0" />}
        {children}
      </Tag>
    )
  },
)

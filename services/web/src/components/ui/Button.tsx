<<<<<<< HEAD
import { forwardRef, type ReactNode, type MouseEventHandler, type CSSProperties } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'outline' | 'gradient'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export type ButtonProps = {
  as?: 'button' | 'a' | 'div'
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconOnly?: boolean
  fullWidth?: boolean
  disabled?: boolean
  title?: string
  children?: ReactNode
  className?: string
  href?: string
  type?: 'button' | 'submit' | 'reset'
  target?: string
  rel?: string
  onClick?: MouseEventHandler
  style?: CSSProperties
  'aria-label'?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-[var(--shadow-md)]',
  gradient:
    'text-white shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-elevated)]',
  secondary:
    'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-glass-border)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-glass-border-hover)]',
  ghost:
    'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
  danger:
    'bg-[var(--color-status-blocked)] text-white hover:opacity-90 shadow-[var(--shadow-md)]',
  success:
    'bg-[var(--color-status-done)] text-white hover:opacity-90 shadow-[var(--shadow-md)]',
  warning:
    'bg-[var(--color-status-progress)] text-white hover:opacity-90 shadow-[var(--shadow-md)]',
  outline:
    'border border-[var(--color-glass-border-hover)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-accent)]',
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-label rounded-md gap-1.5',
  sm: 'h-8 px-3 text-body-sm rounded-md gap-1.5',
  md: 'h-10 px-4 text-body rounded-md gap-2',
  lg: 'h-12 px-6 text-body-lg rounded-lg gap-2.5',
}

const iconOnlyStyles: Record<ButtonSize, string> = {
  xs: 'w-7 p-0',
  sm: 'w-8 p-0',
  md: 'w-10 p-0',
  lg: 'w-12 p-0',
}

const iconSizes: Record<ButtonSize, number> = { xs: 12, sm: 14, md: 16, lg: 18 }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      as: Tag = 'button',
      variant = 'primary',
      size = 'md',
      loading,
      iconOnly,
      fullWidth,
      disabled,
      className,
      children,
      style,
      type,
      ...props
    },
    ref,
  ) => {
    const isGradient = variant === 'gradient'
    const mergedStyle: CSSProperties = isGradient
      ? {
          background: 'var(--gradient-accent)',
          ...style,
        }
      : style ?? {}

    return (
      <Tag
        ref={ref as any}
        type={Tag === 'button' ? type ?? 'button' : undefined}
        className={clsx(
          'relative inline-flex items-center justify-center font-medium select-none',
          'transition-[background,border-color,color,box-shadow,transform,opacity] duration-180 ease-out',
          'focus:outline-none focus-visible:shadow-[var(--shadow-focus)]',
          'disabled:opacity-50 disabled:pointer-events-none',
          'press-shrink',
          variantStyles[variant],
          iconOnly ? iconOnlyStyles[size] : sizeStyles[size],
          loading && 'opacity-80 pointer-events-none',
          fullWidth && 'w-full',
          className,
        )}
        disabled={Tag === 'button' ? (disabled || loading) : undefined}
        aria-disabled={disabled || loading || undefined}
        aria-busy={loading || undefined}
        style={mergedStyle}
        {...props}
      >
        {loading && (
          <Loader2
            size={iconSizes[size]}
            className="animate-spin shrink-0"
            aria-hidden="true"
          />
        )}
        {children}
      </Tag>
    )
  },
)
=======
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:   'bg-indigo-600 hover:bg-indigo-500 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200',
  ghost:     'bg-transparent hover:bg-gray-800 text-gray-300',
  danger:    'bg-red-600 hover:bg-red-500 text-white',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
>>>>>>> origin/master

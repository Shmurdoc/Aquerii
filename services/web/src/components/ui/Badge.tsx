import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'error' | 'info'
type BadgeSize = 'sm' | 'md' | 'lg'

type BadgeProps = {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  pill?: boolean
  removable?: boolean
  onRemove?: () => void
  icon?: LucideIcon
  children?: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-glass-border)]',
  primary: 'bg-[var(--color-accent)] text-white',
  success: 'bg-[var(--color-status-done)] text-white',
  warning: 'bg-[var(--color-status-progress)] text-white',
  danger: 'bg-[var(--color-status-blocked)] text-white',
  error: 'bg-[var(--color-status-blocked)] text-white',
  info: 'bg-[var(--color-status-review)] text-white',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-0.5 text-xs gap-1',
  lg: 'px-2.5 py-1 text-sm gap-1.5',
}

export function Badge({ variant = 'default', size = 'md', dot, pill, removable, onRemove, icon: Icon, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium select-none',
        variantStyles[variant],
        sizeStyles[size],
        pill ? 'rounded-full' : 'rounded-md',
        className,
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {Icon && <Icon size={size === 'sm' ? 10 : size === 'lg' ? 14 : 12} />}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 p-0.5 rounded-full hover:bg-black/20 transition-colors"
        >
          <X size={size === 'sm' ? 8 : 10} />
        </button>
      )}
    </span>
  )
}

import { forwardRef, type ReactNode, type MouseEventHandler } from 'react'
import { clsx } from 'clsx'

type CardVariant = 'default' | 'interactive' | 'glass'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

type CardProps = {
  variant?: CardVariant
  padding?: CardPadding
  onClick?: MouseEventHandler
  children?: ReactNode
  className?: string
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)]',
  interactive: 'bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] cursor-pointer hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-glass-border-hover)] transition-all duration-150',
  glass: 'bg-[var(--color-glass-bg)] border border-[var(--color-glass-border)] backdrop-blur-xl',
}

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', onClick, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (onClick as any)(e) } } : undefined}
        className={clsx(
          'rounded-xl',
          variantStyles[variant],
          paddingStyles[padding],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

type CardSectionProps = {
  children?: ReactNode
  className?: string
}

function CardHeader({ children, className }: CardSectionProps) {
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      {children}
    </div>
  )
}

function CardBody({ children, className }: CardSectionProps) {
  return (
    <div className={clsx(className)}>
      {children}
    </div>
  )
}

function CardFooter({ children, className }: CardSectionProps) {
  return (
    <div className={clsx('flex items-center gap-3 mt-4 pt-3 border-t border-[var(--color-glass-border)]', className)}>
      {children}
    </div>
  )
}

(Card as any).Header = CardHeader
(Card as any).Body = CardBody
(Card as any).Footer = CardFooter

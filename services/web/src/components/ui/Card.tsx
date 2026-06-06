import { forwardRef, type ReactNode, type MouseEventHandler, type CSSProperties, type ForwardRefExoticComponent, type RefAttributes } from 'react'
import { clsx } from 'clsx'

type CardVariant = 'default' | 'interactive' | 'glass' | 'elevated' | 'outline'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

type CardProps = {
  variant?: CardVariant
  padding?: CardPadding
  onClick?: MouseEventHandler
  children?: ReactNode
  className?: string
  style?: CSSProperties
  role?: string
  'aria-label'?: string
}

const variantStyles: Record<CardVariant, string> = {
  default:
    'bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)]',
  interactive:
    'bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] cursor-pointer hover:border-[var(--color-glass-border-hover)] hover:bg-[var(--color-bg-elevated)] active:scale-[0.998]',
  glass:
    'bg-[var(--color-glass-bg)] border border-[var(--color-glass-border)] backdrop-blur-md',
  elevated:
    'bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)] shadow-[var(--shadow-lg)]',
  outline:
    'bg-transparent border border-[var(--color-glass-border)]',
}

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const baseTransition =
  'transition-[background,border-color,box-shadow,transform] duration-200 ease-out'

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      onClick,
      children,
      className,
      style,
      role,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        role={role ?? (onClick ? 'button' : undefined)}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  ;(onClick as any)(e)
                }
              }
            : undefined
        }
        style={style}
        className={clsx(
          'rounded-md',
          baseTransition,
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

type CardComponent = ForwardRefExoticComponent<
  CardProps & RefAttributes<HTMLDivElement>
> & {
  Header: typeof CardHeader
  Body: typeof CardBody
  Footer: typeof CardFooter
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
    <div
      className={clsx(
        'flex items-center gap-3 mt-4 pt-3 border-t border-[var(--color-glass-border)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* eslint-disable no-extra-semi */
;(Card as any).Header = CardHeader
;(Card as any).Body = CardBody
;(Card as any).Footer = CardFooter
/* eslint-enable no-extra-semi */

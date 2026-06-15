import { HTMLAttributes, forwardRef } from 'react'

type Variant = 'default' | 'glass' | 'interactive'

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  padding?: string
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-gray-900 border border-gray-800',
  glass:   'bg-white/5 backdrop-blur-lg border border-white/10',
  interactive: 'bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-glass-border-hover)] cursor-pointer transition-colors',
}

export const Card = forwardRef<HTMLDivElement, Props>(
  ({ variant = 'default', className = '', padding: paddingVal, children, ...props }, ref) => (
    <div ref={ref} className={`rounded-xl ${paddingVal ?? 'p-6'} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  )
)

Card.displayName = 'Card'

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 ${className}`} {...props} />
}

export function CardBody({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />
}

export function CardFooter({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-4 pt-4 border-t border-gray-800 ${className}`} {...props} />
}

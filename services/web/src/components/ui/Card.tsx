import { HTMLAttributes, forwardRef } from 'react'

type Variant = 'default' | 'glass'

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-gray-900 border border-gray-800',
  glass:   'bg-white/5 backdrop-blur-lg border border-white/10',
}

export const Card = forwardRef<HTMLDivElement, Props>(
  ({ variant = 'default', className = '', children, ...props }, ref) => (
    <div ref={ref} className={`rounded-xl p-6 ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  )
)

Card.displayName = 'Card'

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 ${className}`} {...props} />
}

export function CardBody({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />
}

export function CardFooter({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-4 pt-4 border-t border-gray-800 ${className}`} {...props} />
}

import { HTMLAttributes, forwardRef } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info'
type Size = 'sm' | 'md' | 'lg'

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  dot?: boolean
  size?: Size
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-gray-700 text-gray-200',
  success: 'bg-green-900/50 text-green-300',
  warning: 'bg-yellow-900/50 text-yellow-300',
  danger:  'bg-red-900/50 text-red-300',
  info:    'bg-blue-900/50 text-blue-300',
}

const dotColors: Record<Variant, string> = {
  default: 'bg-gray-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger:  'bg-red-400',
  info:    'bg-blue-400',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export const Badge = forwardRef<HTMLSpanElement, Props>(
  ({ variant = 'default', dot, size = 'sm', className = '', children, ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
)

Badge.displayName = 'Badge'

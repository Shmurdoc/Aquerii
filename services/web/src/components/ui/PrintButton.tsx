import { Printer } from 'lucide-react'
import { Button } from './Button'
import type { ButtonProps } from './Button'

type PrintButtonProps = Omit<ButtonProps, 'children' | 'onClick'> & {
  label?: string
}

export function PrintButton({ label = 'Print', variant = 'secondary', size = 'sm', className, ...props }: PrintButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => window.print()}
      className={`print-button ${className ?? ''}`}
      title={`Print ${label}`}
      aria-label={`Print ${label}`}
      {...props}
    >
      <Printer size={size === 'xs' ? 12 : 14} />
      {label}
    </Button>
  )
}

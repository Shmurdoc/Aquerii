import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { X } from 'lucide-react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: ModalSize
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[90vw] max-h-[90vh]',
}

function useLockedBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [locked])
}

export function Modal({ open, onClose, title, description, size = 'md', closeOnOutsideClick = true, closeOnEscape = true, children, footer, className }: ModalProps) {
  useLockedBody(open)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') onClose()
  }, [closeOnEscape, onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnOutsideClick ? onClose : undefined}
      />
      <div
        className={clsx(
          'relative w-full rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] shadow-lg animate-scale-in',
          sizeStyles[size],
          className,
        )}
      >
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors shrink-0 ml-3"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-3 max-h-[60vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--color-glass-border)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { useReducedMotion } from '@/lib/motion'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: string
  size?: ModalSize
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
  children?: ReactNode
  footer?: ReactNode
  className?: string
  hideCloseButton?: boolean
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
    return () => {
      document.body.style.overflow = original
    }
  }, [locked])
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  closeOnOutsideClick = true,
  closeOnEscape = true,
  children,
  footer,
  className,
  hideCloseButton,
}: ModalProps) {
  useLockedBody(open)
  const reduced = useReducedMotion()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') onClose()
    },
    [closeOnEscape, onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className={clsx(
          'absolute inset-0 bg-black/65 backdrop-blur-md',
          !reduced && 'animate-backdrop-in',
        )}
        onClick={closeOnOutsideClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        className={clsx(
          'relative w-full rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)]',
          'shadow-[var(--shadow-elevated)] overflow-hidden',
          !reduced && 'animate-modal-in',
          sizeStyles[size],
          className,
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-3 p-5 pb-3">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-heading font-semibold text-[var(--color-text-primary)] truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-body-sm text-[var(--color-text-secondary)] mt-0.5">
                  {description}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className={clsx(
                  'shrink-0 p-1.5 rounded-md text-[var(--color-text-muted)]',
                  'hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
                  'transition-colors duration-150 ease-out press-shrink',
                )}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-5 py-3 max-h-[60vh] overflow-y-auto">{children}</div>
        {footer && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--color-glass-border)] bg-[var(--color-bg-base)]"
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

import { forwardRef, useRef, useEffect, type InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { Check, Minus } from 'lucide-react'

type CheckboxProps = {
  label?: string
  indeterminate?: boolean
  error?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate, error, disabled, className, ...props }, ref) => {
    const internalRef = useRef<HTMLInputElement | null>(null)
    const setRef = (el: HTMLInputElement | null) => {
      internalRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el
    }

    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate ?? false
      }
    }, [indeterminate])

    const isActive = props.checked || indeterminate

    return (
      <label className={clsx(
        'inline-flex items-center gap-2.5',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}>
        <div className="relative flex items-center justify-center w-4 h-4">
          <input
            ref={setRef}
            type="checkbox"
            disabled={disabled}
            className="peer absolute inset-0 opacity-0 w-full h-full cursor-inherit z-10"
            {...props}
          />
          <div
            className={clsx(
              'w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-accent)] peer-focus-visible:ring-offset-1',
              error && !isActive
                ? 'border-red-500 bg-red-500/10'
                : isActive
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                  : 'border-[var(--color-glass-border)] bg-[var(--color-bg-input)]',
            )}
          >
            {indeterminate ? (
              <Minus size={10} className="text-white" />
            ) : (
              <Check size={10} className={clsx('text-white transition-opacity', props.checked ? 'opacity-100' : 'opacity-0')} />
            )}
          </div>
        </div>
        {label && <span className="text-sm text-[var(--color-text-primary)] select-none">{label}</span>}
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'

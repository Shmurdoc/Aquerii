import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, compact, className }: EmptyStateProps) {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8 gap-2' : 'py-16 gap-3',
      className,
    )}>
      {Icon && (
        <div
          className={clsx(
            'flex items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent-text)]',
            compact ? 'w-10 h-10' : 'w-14 h-14',
          )}
        >
          <Icon size={compact ? 20 : 28} />
        </div>
      )}
      <h3 className={clsx(
        'font-semibold text-[var(--color-text-primary)]',
        compact ? 'text-sm' : 'text-base',
      )}>
        {title}
      </h3>
      {description && (
        <p className={clsx(
          'text-[var(--color-text-muted)] max-w-xs',
          compact ? 'text-xs' : 'text-sm',
        )}>
          {description}
        </p>
      )}
      {action && (
        <div className={compact ? 'mt-1' : 'mt-2'}>
          {action}
        </div>
      )}
    </div>
  )
}

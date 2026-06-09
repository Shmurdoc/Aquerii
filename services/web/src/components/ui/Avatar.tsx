import { useState, type ReactNode, type ImgHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type AvatarPresence = 'online' | 'busy' | 'idle'

type AvatarProps = {
  src?: string
  alt?: string
  name?: string
  size?: AvatarSize
  shape?: 'circle' | 'rounded'
  presence?: AvatarPresence
  color?: string
  className?: string
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'name' | 'size'>

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

const presenceColors: Record<AvatarPresence, string> = {
  online: 'bg-[var(--color-status-done)]',
  busy: 'bg-[var(--color-status-blocked)]',
  idle: 'bg-[var(--color-status-progress)]',
}

const presenceSizes: Record<AvatarSize, string> = {
  xs: 'w-1.5 h-1.5 ring-1',
  sm: 'w-2 h-2 ring-1',
  md: 'w-2.5 h-2.5 ring-2',
  lg: 'w-3 h-3 ring-2',
  xl: 'w-3.5 h-3.5 ring-2',
}

const fallbackColors = [
  'bg-[var(--color-accent)]',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-cyan-600',
]

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return fallbackColors[Math.abs(hash) % fallbackColors.length]
}

export function Avatar({ src, alt = '', name, size = 'md', shape = 'circle', presence, color, className, ...imgProps }: AvatarProps) {
  const [error, setError] = useState(false)
  const showImage = src && !error
  const initials = name ? getInitials(name) : ''
  const bgColor = color || (name ? hashColor(name) : 'bg-[var(--color-bg-elevated)]')

  return (
    <div className={clsx('relative inline-flex shrink-0', className)}>
      <div
        className={clsx(
          'flex items-center justify-center font-medium text-[var(--color-text-primary)] overflow-hidden',
          sizeStyles[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          showImage ? '' : bgColor,
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt}
            onError={() => setError(true)}
            className="w-full h-full object-cover"
            {...imgProps}
          />
        ) : initials ? (
          initials
        ) : (
          <svg className="w-1/2 h-1/2 text-[var(--color-text-muted)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>
      {presence && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full ring-[var(--color-bg-deepest)]',
            presenceColors[presence],
            presenceSizes[size],
          )}
        />
      )}
    </div>
  )
}

type AvatarGroupProps = {
  children: ReactNode
  max?: number
  size?: AvatarSize
  className?: string
}

function AvatarGroup({ children, max = 4, size = 'md', className }: AvatarGroupProps) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean)
  const visible = items.slice(0, max)
  const overflow = items.length - max

  return (
    <div className={clsx('flex items-center', className)}>
      {visible.map((child, i) => (
        <div key={i} className={clsx(
          'ring-2 ring-[var(--color-bg-deepest)] rounded-full',
          i !== 0 && '-ml-2',
        )}>
          {child}
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-elevated)] text-xs text-[var(--color-text-muted)] ring-2 ring-[var(--color-bg-deepest)] -ml-2 font-medium">
          +{overflow}
        </div>
      )}
    </div>
  )
}

Avatar.Group = AvatarGroup

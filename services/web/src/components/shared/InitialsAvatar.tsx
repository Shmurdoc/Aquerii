interface InitialsAvatarProps {
  name: string
  color?: string
  size?: number
  className?: string
  shape?: 'circle' | 'rounded'
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function getContrastColor(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#111111' : '#ffffff'
}

export function InitialsAvatar({
  name,
  color = '#7c3aed',
  size = 32,
  className,
  shape = 'rounded',
}: InitialsAvatarProps) {
  const initials = getInitials(name)
  const textColor = getContrastColor(color)
  const borderRadius = shape === 'circle' ? '50%' : `${Math.round(size * 0.22)}px`

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius,
        background: color,
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        flexShrink: 0,
        userSelect: 'none',
        letterSpacing: '-0.02em',
      }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  )
}

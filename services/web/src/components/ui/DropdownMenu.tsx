import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { ChevronRight } from 'lucide-react'

type DropdownContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  activeIndex: number
  setActiveIndex: (v: number) => void
  triggerRef: React.RefObject<HTMLButtonElement>
  itemsRef: React.RefObject<HTMLDivElement>
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

function useDropdown() {
  const ctx = useContext(DropdownContext)
  if (!ctx) throw new Error('Dropdown compound components must be used within <DropdownMenu>')
  return ctx
}

type DropdownMenuProps = {
  children: ReactNode
  onOpenChange?: (open: boolean) => void
}

export function DropdownMenu({ children, onOpenChange }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemsRef = useRef<HTMLDivElement>(null)

  const handleSetOpen = useCallback((v: boolean) => {
    setOpen(v)
    onOpenChange?.(v)
    if (!v) setActiveIndex(-1)
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (
        itemsRef.current && !itemsRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        handleSetOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, handleSetOpen])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    const items = itemsRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([data-disabled])')
    if (!items || items.length === 0) return

    if (e.key === 'Escape') {
      e.preventDefault()
      handleSetOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, items.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    }
    if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault()
      items[activeIndex].click()
    }
  }, [open, activeIndex, handleSetOpen])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <DropdownContext.Provider value={{ open, setOpen: handleSetOpen, activeIndex, setActiveIndex, triggerRef, itemsRef }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

type DropdownMenuTriggerProps = {
  children: ReactNode
  className?: string
  asChild?: boolean
}

export function DropdownMenuTrigger({ children, className, asChild }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = useDropdown()

  if (asChild) {
    return (
      <div ref={triggerRef as any} onClick={() => setOpen(!open)} className={className}>
        {children}
      </div>
    )
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-haspopup="menu"
      className={className}
    >
      {children}
    </button>
  )
}

type DropdownMenuItemsProps = {
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}

export function DropdownMenuItems({ children, align = 'start', className }: DropdownMenuItemsProps) {
  const { open, itemsRef } = useDropdown()

  if (!open) return null

  return (
    <div
      ref={itemsRef}
      role="menu"
      className={clsx(
        'absolute z-50 mt-1 min-w-[180px] rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] shadow-lg py-1 animate-scale-in',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

type DropdownMenuItemProps = {
  icon?: LucideIcon
  label: string
  shortcut?: string
  disabled?: boolean
  onClick?: () => void
  children?: ReactNode
  className?: string
}

export function DropdownMenuItem({ icon: Icon, label, shortcut, disabled, onClick, children, className }: DropdownMenuItemProps) {
  const { activeIndex, setOpen } = useDropdown()

  const handleClick = () => {
    if (disabled) return
    onClick?.()
    setOpen(false)
  }

  return (
    <button
      type="button"
      role="menuitem"
      data-disabled={disabled ? '' : undefined}
      disabled={disabled}
      onClick={handleClick}
      className={clsx(
        'flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors',
        'focus:outline-none',
        disabled
          ? 'text-[var(--color-text-muted)] cursor-not-allowed'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer',
        className,
      )}
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {shortcut && (
        <span className="text-xs text-[var(--color-text-muted)] ml-4">{shortcut}</span>
      )}
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return (
    <div className="my-1 border-t border-[var(--color-glass-border)]" />
  )
}

type DropdownMenuSubmenuProps = {
  icon?: LucideIcon
  label: string
  children: ReactNode
  className?: string
}

export function DropdownMenuSubmenu({ icon: Icon, label, children, className }: DropdownMenuSubmenuProps) {
  const [subOpen, setSubOpen] = useState(false)
  const subRef = useRef<HTMLDivElement>(null)
  const itemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!subOpen) return
    const handleClick = (e: MouseEvent) => {
      if (subRef.current && !subRef.current.contains(e.target as Node) && itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setSubOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [subOpen])

  return (
    <div className="relative">
      <button
        ref={itemRef}
        type="button"
        role="menuitem"
        onClick={() => setSubOpen(!subOpen)}
        onMouseEnter={() => setSubOpen(true)}
        onMouseLeave={() => setSubOpen(false)}
        className={clsx(
          'flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors',
          'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer',
          className,
        )}
      >
        {Icon && <Icon size={16} className="shrink-0" />}
        <span className="flex-1 truncate">{label}</span>
        <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
      </button>
      {subOpen && (
        <div
          ref={subRef}
          className="absolute left-full top-0 ml-1 min-w-[160px] rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] shadow-lg py-1 animate-scale-in"
          onMouseEnter={() => setSubOpen(true)}
          onMouseLeave={() => setSubOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

import { createContext, useContext, useState, type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

type TabsOrientation = 'horizontal' | 'vertical'
type TabValue = string

type TabsContextValue = {
  value: TabValue
  onValueChange: (v: TabValue) => void
  orientation: TabsOrientation
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs compound components must be used within <Tabs>')
  return ctx
}

type TabsProps = {
  defaultValue?: TabValue
  value?: TabValue
  onValueChange?: (v: TabValue) => void
  orientation?: TabsOrientation
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue, value: controlledValue, onValueChange, orientation = 'horizontal', children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const value = controlledValue ?? internalValue
  const handleChange = (v: TabValue) => {
    if (onValueChange === undefined) setInternalValue(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange, orientation }}>
      <div className={clsx(
        'flex',
        orientation === 'vertical' ? 'flex-row gap-4' : 'flex-col',
        className,
      )}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

type TabListProps = {
  children: ReactNode
  className?: string
}

export function TabList({ children, className }: TabListProps) {
  const { orientation } = useTabs()
  return (
    <div
      className={clsx(
        'flex',
        orientation === 'vertical'
          ? 'flex-col border-l border-[var(--color-glass-border)]'
          : 'border-b border-[var(--color-glass-border)]',
        className,
      )}
      role="tablist"
    >
      {children}
    </div>
  )
}

type TabProps = {
  value: TabValue
  children?: ReactNode
  icon?: LucideIcon
  disabled?: boolean
  className?: string
}

export function Tab({ value, children, icon: Icon, disabled, className }: TabProps) {
  const { value: selectedValue, onValueChange, orientation } = useTabs()
  const isActive = selectedValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={clsx(
        'inline-flex items-center gap-2 whitespace-nowrap font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset',
        orientation === 'vertical'
          ? 'px-3 py-2 text-sm border-l-2 -ml-px'
          : 'px-4 py-2.5 text-sm border-b-2 -mb-px',
        isActive
          ? 'text-[var(--color-accent-text)] border-[var(--color-accent)]'
          : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  )
}

type TabPanelProps = {
  value: TabValue
  children?: ReactNode
  className?: string
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { value: selectedValue } = useTabs()
  if (selectedValue !== value) return null
  return (
    <div role="tabpanel" className={clsx(className)}>
      {children}
    </div>
  )
}

import { createContext, useContext, useState, useRef, type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

type TabsOrientation = 'horizontal' | 'vertical'
type TabValue = string

type TabsContextValue = {
  value: TabValue
  onValueChange: (v: TabValue) => void
  orientation: TabsOrientation
  baseId: string
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
  id?: string
}

let tabGroupCounter = 0
function useTabGroupId(provided?: string) {
  const ref = useRef<string | null>(null)
  if (ref.current === null) {
    ref.current = provided ?? `tabs-${++tabGroupCounter}`
  }
  return ref.current
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  orientation = 'horizontal',
  children,
  className,
  id,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const value = controlledValue ?? internalValue
  const baseId = useTabGroupId(id)
  const handleChange = (v: TabValue) => {
    if (onValueChange === undefined) setInternalValue(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange, orientation, baseId }}>
      <div
        className={clsx(
          'flex',
          orientation === 'vertical' ? 'flex-row gap-4' : 'flex-col',
          className,
        )}
      >
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
  const { orientation, baseId } = useTabs()
  return (
    <div
      className={clsx(
        'relative flex',
        orientation === 'vertical'
          ? 'flex-col border-l border-[var(--color-glass-border)]'
          : 'border-b border-[var(--color-glass-border)]',
        className,
      )}
      role="tablist"
      id={`${baseId}-list`}
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
  count?: number
}

export function Tab({ value, children, icon: Icon, disabled, className, count }: TabProps) {
  const { value: selectedValue, onValueChange, orientation, baseId } = useTabs()
  const isActive = selectedValue === value
  const tabId = `${baseId}-tab-${value}`
  const panelId = `${baseId}-panel-${value}`

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={clsx(
        'relative inline-flex items-center gap-2 whitespace-nowrap font-medium',
        'transition-[color,background,transform] duration-200 ease-out press-shrink',
        'focus:outline-none focus-visible:shadow-[var(--shadow-focus)]',
        orientation === 'vertical'
          ? 'px-3 py-2 text-body-sm border-l-2 -ml-px'
          : 'px-4 py-2.5 text-body-sm border-b-2 -mb-px',
        isActive
          ? 'text-[var(--color-accent-text)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {Icon && <Icon size={15} aria-hidden="true" />}
      {children}
      {typeof count === 'number' && (
        <span
          className={clsx(
            'ml-0.5 text-micro font-semibold px-1.5 py-0.5 rounded-full transition-colors',
            isActive
              ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
              : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]',
          )}
          aria-hidden="true"
        >
          {count}
        </span>
      )}
      {isActive && (
        <span
          aria-hidden="true"
          className={clsx(
            'absolute bg-[var(--color-accent)]',
            orientation === 'vertical'
              ? 'left-[-1px] top-1 bottom-1 w-0.5 rounded-full animate-fade-in'
              : 'left-2 right-2 -bottom-px h-0.5 rounded-full animate-fade-in',
          )}
        />
      )}
    </button>
  )
}

type TabPanelProps = {
  value: TabValue
  children?: ReactNode
  className?: string
  forceMount?: boolean
}

export function TabPanel({ value, children, className, forceMount }: TabPanelProps) {
  const { value: selectedValue, baseId } = useTabs()
  const isActive = selectedValue === value
  const tabId = `${baseId}-tab-${value}`
  const panelId = `${baseId}-panel-${value}`

  if (!isActive && !forceMount) return null

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      hidden={!isActive}
      className={clsx(isActive && 'animate-fade-in', className)}
    >
      {children}
    </div>
  )
}

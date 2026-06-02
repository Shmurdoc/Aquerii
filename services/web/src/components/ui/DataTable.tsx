import { useState, useMemo, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { Skeleton } from './Skeleton'

export type Column<T> = {
  key: string
  header: string
  sortable?: boolean
  hideOnMobile?: boolean
  className?: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: Array<Column<T> | Column<any>>
  data: T[]
  keyExtractor: (row: T) => string
  isLoading?: boolean
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyMessage?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  selectedRows?: Set<string>
  onSelectionChange?: (selected: Set<string>) => void
  pageSize?: number
  sortable?: boolean
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyMessage,
  emptyDescription,
  emptyAction,
  selectedRows,
  onSelectionChange,
  pageSize = 20,
  sortable = true,
  className,
}: DataTableProps<T>) {
  const resolvedEmptyTitle = emptyTitle ?? emptyMessage ?? 'No data'
  const resolvedIsLoading = isLoading ?? loading ?? false
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey]
      const bVal = (b as any)[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const allSelected = data.length > 0 && selectedRows?.size === data.length

  const handleSort = (key: string) => {
    if (!sortable) return
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleSelectAll = () => {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(data.map(keyExtractor)))
    }
  }

  const toggleRow = (id: string) => {
    if (!onSelectionChange || !selectedRows) return
    const next = new Set(selectedRows)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (!column.sortable || !sortable) return null
    if (sortKey !== column.key) return <ChevronsUpDown size={12} className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <AlertCircle size={24} className="text-red-400" />
        <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw size={12} /> Retry
          </Button>
        )}
      </div>
    )
  }

  if (!resolvedIsLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{resolvedEmptyTitle}</p>
        {emptyDescription && <p className="text-xs text-[var(--color-text-muted)]">{emptyDescription}</p>}
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    )
  }

  return (
    <div className={clsx('flex flex-col', className)}>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-glass-border)]">
              {selectedRows && (
                <th className="w-10 px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-[var(--color-glass-border)] bg-[var(--color-bg-input)] accent-[var(--color-accent)]"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider',
                    col.sortable && sortable && 'cursor-pointer select-none group',
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.className,
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && <SortIcon column={col} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resolvedIsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--color-glass-border)]">
                  {selectedRows && <td className="px-3 py-3"><Skeleton className="w-4 h-4 rounded" /></td>}
                  {columns.map(col => (
                    <td key={col.key} className={clsx('px-3 py-3', col.hideOnMobile && 'hidden md:table-cell')}>
                      <Skeleton className={clsx('h-4 rounded', col.key === 'name' ? 'w-32' : 'w-20')} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              paginated.map(row => {
                const id = keyExtractor(row)
                return (
                  <tr
                    key={id}
                    className={clsx(
                      'border-b border-[var(--color-glass-border)] transition-colors',
                      selectedRows?.has(id) ? 'bg-[var(--color-accent-light)]' : 'hover:bg-[var(--color-bg-hover)]',
                    )}
                  >
                    {selectedRows && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(id)}
                          onChange={() => toggleRow(id)}
                          className="rounded border-[var(--color-glass-border)] bg-[var(--color-bg-input)] accent-[var(--color-accent)]"
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.key} className={clsx('px-3 py-3', col.hideOnMobile && 'hidden md:table-cell', col.className)}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {resolvedIsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-lg p-4 space-y-2">
              {columns.filter(c => !c.hideOnMobile).map(col => (
                <Skeleton key={col.key} className={clsx('h-4 rounded', col === columns[0] ? 'w-40' : 'w-24')} />
              ))}
            </div>
          ))
        ) : (
          paginated.map(row => {
            const id = keyExtractor(row)
            return (
              <div
                key={id}
                className={clsx(
                  'bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-lg p-4 space-y-1.5 transition-colors',
                  selectedRows?.has(id) && 'border-[var(--color-accent)]',
                )}
              >
                {selectedRows && (
                  <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-[var(--color-glass-border)]">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(id)}
                      onChange={() => toggleRow(id)}
                      className="rounded border-[var(--color-glass-border)] bg-[var(--color-bg-input)] accent-[var(--color-accent)]"
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">Select</span>
                  </div>
                )}
                {columns.filter(c => !c.hideOnMobile).map(col => (
                  <div key={col.key} className="flex items-start gap-2">
                    <span className="text-xs text-[var(--color-text-muted)] min-w-[70px] shrink-0">{col.header}</span>
                    <span className="text-sm text-[var(--color-text-primary)]">{col.render(row)}</span>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {!resolvedIsLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-3 border-t border-[var(--color-glass-border)]">
          <span className="text-xs text-[var(--color-text-muted)]">
            {sorted.length} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={safePage === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <Button
                key={i}
                size="sm"
                variant={i === safePage ? 'primary' : 'ghost'}
                onClick={() => setPage(i)}
                className="min-w-[28px]"
              >
                {i + 1}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useCallback } from 'react'

export function useMultiSelect<T extends string = string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set())

  const toggle = useCallback((id: T) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: T[]) => {
    setSelected(new Set(ids))
  }, [])

  const selectNone = useCallback(() => {
    setSelected(new Set())
  }, [])

  const isSelected = useCallback((id: T) => selected.has(id), [selected])

  const toggleAll = useCallback((ids: T[]) => {
    if (ids.every(id => selected.has(id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(ids))
    }
  }, [selected])

  return {
    selected,
    selectedArray: Array.from(selected),
    selectedCount: selected.size,
    toggle,
    selectAll,
    selectNone,
    isSelected,
    toggleAll,
    hasSelection: selected.size > 0,
  }
}

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Item {
  id: string
  board_id: string
  group_id: string
  workspace_id: string
  title: string
  description?: string
  status?: string
  priority?: string
  assignees?: { id: string; name: string; avatar_url?: string }[]
  due_date?: string
  position: number
  version: number
  created_at: string
  updated_at: string
}

interface ItemState {
  items: Record<string, Item[]>        // keyed by board_id
  itemsById: Record<string, Item>
  setItems: (boardId: string, items: Item[]) => void
  upsertItem: (item: Item) => void
  removeItem: (boardId: string, itemId: string) => void
  optimisticUpdate: (itemId: string, patch: Partial<Item>) => (() => void)
}

export const useItemStore = create<ItemState>()(
  immer((set, get) => ({
    items: {},
    itemsById: {},

    setItems: (boardId, items) => set((s) => {
      s.items[boardId] = items
      items.forEach((i) => { s.itemsById[i.id] = i })
    }),

    upsertItem: (item) => set((s) => {
      s.itemsById[item.id] = item
      const arr = s.items[item.board_id] ?? []
      const idx = arr.findIndex((i) => i.id === item.id)
      if (idx >= 0) arr[idx] = item
      else arr.push(item)
      s.items[item.board_id] = arr
    }),

    removeItem: (boardId, itemId) => set((s) => {
      delete s.itemsById[itemId]
      s.items[boardId] = (s.items[boardId] ?? []).filter((i) => i.id !== itemId)
    }),

    optimisticUpdate: (itemId, patch) => {
      const prev = get().itemsById[itemId]
      set((s) => {
        if (s.itemsById[itemId]) Object.assign(s.itemsById[itemId], patch)
      })
      return () => {
        if (prev) set((s) => { s.itemsById[itemId] = prev })
      }
    },
  }))
)

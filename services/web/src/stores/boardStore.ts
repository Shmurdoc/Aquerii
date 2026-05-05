import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Board {
  id: string
  workspace_id: string
  name: string
  description?: string
  board_type: 'board' | 'calendar' | 'table'
  settings: Record<string, unknown>
  is_archived: boolean
  position: number
  created_at: string
}

export interface BoardColumn {
  id: string
  board_id: string
  name: string
  field_type: string
  options?: Record<string, unknown>
  is_system: boolean
  position: number
}

export interface BoardGroup {
  id: string
  board_id: string
  name: string
  color?: string
  is_collapsed: boolean
  position: number
}

interface BoardState {
  boards: Record<string, Board>
  columns: Record<string, BoardColumn[]>   // keyed by board_id
  groups: Record<string, BoardGroup[]>     // keyed by board_id
  activeView: 'kanban' | 'table' | 'calendar'
  setBoards: (boards: Board[]) => void
  setBoard: (board: Board) => void
  setColumns: (boardId: string, columns: BoardColumn[]) => void
  setGroups: (boardId: string, groups: BoardGroup[]) => void
  setActiveView: (view: 'kanban' | 'table' | 'calendar') => void
  optimisticUpdateBoard: (boardId: string, patch: Partial<Board>) => void
}

export const useBoardStore = create<BoardState>()(
  immer((set) => ({
    boards: {},
    columns: {},
    groups: {},
    activeView: 'kanban',

    setBoards: (boards) => set((s) => {
      s.boards = {}
      boards.forEach((b) => { s.boards[b.id] = b })
    }),

    setBoard: (board) => set((s) => { s.boards[board.id] = board }),

    setColumns: (boardId, columns) => set((s) => { s.columns[boardId] = columns }),

    setGroups: (boardId, groups) => set((s) => { s.groups[boardId] = groups }),

    setActiveView: (view) => set((s) => { s.activeView = view }),

    optimisticUpdateBoard: (boardId, patch) => set((s) => {
      if (s.boards[boardId]) Object.assign(s.boards[boardId], patch)
    }),
  }))
)

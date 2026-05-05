import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBoard } from '@/hooks/useBoards'
import { useItems } from '@/hooks/useItems'
import BoardTopBar from '@/components/board/BoardTopBar'
import KanbanView  from '@/components/board/KanbanView'
import TableView   from '@/components/board/TableView'
import CalendarView from '@/components/board/CalendarView'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const [view, setView] = useState<'kanban' | 'table' | 'calendar'>('kanban')

  const { data: board, isLoading: boardLoading } = useBoard(boardId!)
  const { data: items = [], isLoading: itemsLoading } = useItems(boardId!)

  if (boardLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Board not found.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <BoardTopBar board={board} view={view} onViewChange={setView} />
      <div className="flex-1 overflow-hidden">
        {view === 'kanban'   && <KanbanView   board={board} items={items} boardId={boardId!} />}
        {view === 'table'    && <TableView    board={board} items={items} boardId={boardId!} />}
        {view === 'calendar' && <CalendarView board={board} items={items} boardId={boardId!} />}
      </div>
    </div>
  )
}

import { useParams } from 'react-router-dom'
import { useBoard } from '@/hooks/useBoards'
import { useItems } from '@/hooks/useItems'
import KanbanView from '@/components/board/KanbanView'
import BoardTopBar from '@/components/board/BoardTopBar'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const { data: board, isLoading } = useBoard(boardId!)
  const { data: items = [] }       = useItems(boardId!)

  if (isLoading || !board) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <BoardTopBar board={board} />
      <div className="flex-1 overflow-hidden">
        <KanbanView board={board} items={items} boardId={boardId!} />
      </div>
    </div>
  )
}

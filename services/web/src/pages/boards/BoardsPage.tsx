import { useState } from 'react'
import { useBoards, useCreateBoard, useDeleteBoard } from '@/hooks/useBoards'
import { useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export default function BoardsPage() {
  const { data: boards = [], isLoading } = useBoards()
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()
  const navigate    = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleCreate = async () => {
    try {
      const res = await createBoard.mutateAsync({ name: 'New Board' })
      navigate(`/boards/${res.data.data.id}`)
    } catch {
      toast.error('Failed to create board.')
    }
  }

  const handleDelete = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete === boardId) {
      try {
        await deleteBoard.mutateAsync(boardId)
        toast.success('Board deleted.')
      } catch {
        toast.error('Failed to delete board.')
      }
      setConfirmDelete(null)
    } else {
      setConfirmDelete(boardId)
      setTimeout(() => setConfirmDelete(c => c === boardId ? null : c), 3000)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Boards</h1>
        <Button variant="primary" size="sm" onClick={handleCreate}>
          <Plus size={14} />
          New Board
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No boards yet"
          description="Create one to get started."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map(board => (
            <div key={board.id} className="relative group">
              <Card
                variant="interactive"
                onClick={() => navigate(`/boards/${board.id}`)}
                data-testid="board-card"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg mb-3"
                  style={{ backgroundColor: board.color ?? '#6366f1' }}
                >
                  {board.icon ?? board.name[0]}
                </div>
                <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors truncate pr-6">
                  {board.name}
                </p>
                {board.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{board.description}</p>
                )}
              </Card>

              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={e => handleDelete(board.id, e)}
                className={`absolute top-3 right-3 ${
                  confirmDelete === board.id
                    ? 'opacity-100 text-red-400 bg-red-500/10'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

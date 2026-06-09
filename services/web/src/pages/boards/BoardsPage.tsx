import { useBoards, useCreateBoard } from '@/hooks/useBoards'
import { useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BoardsPage() {
  const { data: boards = [], isLoading } = useBoards()
  const createBoard = useCreateBoard()
  const navigate    = useNavigate()

  const handleCreate = async () => {
    try {
      const res = await createBoard.mutateAsync({ name: 'New Board' })
      navigate(`/boards/${res.data.data.id}`)
    } catch {
      toast.error('Failed to create board.')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Boards</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} />
          New Board
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <LayoutGrid size={40} className="mb-3 opacity-40" />
          <p className="text-sm">No boards yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map(board => (
            <button
              key={board.id}
              onClick={() => navigate(`/boards/${board.id}`)}
              className="text-left bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl p-4 transition-colors group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg mb-3"
                style={{ backgroundColor: board.color ?? '#6366f1' }}
              >
                {board.icon ?? board.name[0]}
              </div>
              <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors truncate">
                {board.name}
              </p>
              {board.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{board.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

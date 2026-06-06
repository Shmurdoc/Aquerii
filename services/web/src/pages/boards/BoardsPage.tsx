import { useState } from 'react'
import { useBoards, useCreateBoard, useDeleteBoard } from '@/hooks/useBoards'
import { useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, MoreVertical, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuItems, DropdownMenuItem } from '@/components/ui/DropdownMenu'

function NewBoardModal({ onClose }: { onClose: () => void }) {
  const createBoard = useCreateBoard()
  const navigate    = useNavigate()
  const [name, setName]   = useState('')
  const [submit, setSubmit] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmit(true)
    try {
      const res = await createBoard.mutateAsync({ name: trimmed })
      toast.success('Board created.')
      onClose()
      navigate(`/boards/${res.data.data.id}`)
    } catch {
      toast.error('Failed to create board.')
    } finally {
      setSubmit(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New board"
      description="Give your board a name. You can rename it later."
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submit}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { if (name.trim()) handleSubmit({ preventDefault: () => {} } as React.FormEvent) }}
            loading={submit || createBoard.isPending}
            disabled={!name.trim()}
          >
            Create board
          </Button>
        </>
      }
    >
      <Input
        autoFocus
        label="Board name"
        placeholder="e.g. Marketing roadmap"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleSubmit({ preventDefault: () => {} } as React.FormEvent) }}
        containerClassName="!mb-0"
      />
    </Modal>
  )
}

export default function BoardsPage() {
  const { data: boards = [], isLoading } = useBoards()
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()
  const navigate    = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showNew,      setShowNew]      = useState(false)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteBoard.mutateAsync(deleteTarget)
      toast.success('Board deleted.')
    } catch {
      toast.error('Failed to delete board.')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-heading font-semibold text-[var(--color-text-primary)]">Boards</h1>
        <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>
          <Plus size={14} />
          New Board
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] animate-pulse" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No boards yet"
          description="Create one to get started."
          action={
            <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>
              <Plus size={14} /> New board
            </Button>
          }
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
                <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-text)] transition-colors truncate pr-6">
                  {board.name}
                </p>
                {board.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{board.description}</p>
                )}
              </Card>

              <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" iconOnly aria-label="Board actions">
                      <MoreVertical size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuItems align="end">
                    <DropdownMenuItem
                      icon={Trash2}
                      label="Delete board"
                      onClick={() => setDeleteTarget(board.id)}
                    />
                  </DropdownMenuItems>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete board"
        description="Are you sure you want to delete this board? This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              loading={deleteBoard.isPending}
            >
              Delete
            </Button>
          </>
        }
      />

      {showNew && <NewBoardModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

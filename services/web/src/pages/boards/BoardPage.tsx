import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useBoard } from '@/hooks/useBoards'
import type { BoardColumn } from '@/hooks/useBoards'
import { useItems } from '@/hooks/useItems'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { usePresence } from '@/hooks/usePresence'
import BoardTopBar    from '@/components/board/BoardTopBar'
import KanbanView     from '@/components/board/KanbanView'
import TableView      from '@/components/board/TableView'
import CalendarView   from '@/components/board/CalendarView'
import ExcalidrawView from '@/components/board/ExcalidrawView'
import { Plus, MoreVertical, Pencil, Trash2, Check, X, Columns3, GripVertical, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuItems, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { PrintButton } from '@/components/ui'

type ConfirmTarget = { kind: 'group' | 'column'; id: string; name: string }

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const workspace   = useAuthStore(s => s.workspace)
  const qc          = useQueryClient()
  const [view, setView] = useState<'kanban' | 'table' | 'calendar' | 'whiteboard'>('kanban')
  const [editingGroupId,  setEditingGroupId]  = useState<string | null>(null)
  const [editingName,     setEditingName]     = useState('')
  const [addingGroup,     setAddingGroup]     = useState(false)
  const [newGroupName,    setNewGroupName]    = useState('')
  const [showColumns,     setShowColumns]     = useState(false)
  const [editingColId,    setEditingColId]    = useState<string | null>(null)
  const [editingColName,  setEditingColName]  = useState('')
  const [confirmTarget,   setConfirmTarget]   = useState<ConfirmTarget | null>(null)
  const [shareOpen,       setShareOpen]       = useState(false)
  const newGroupRef = useRef<HTMLInputElement>(null)

  const { data: board, isLoading: boardLoading } = useBoard(boardId ?? '')
  const { data: items = [], isLoading: itemsLoading } = useItems(boardId ?? '')
  const onlineUsers = usePresence(boardId ? `board:${boardId}` : null)

  const createGroup = useMutation({
    mutationFn: (name: string) =>
      api.post(`/workspaces/${workspace!.id}/boards/${boardId}/groups`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', boardId] })
      setAddingGroup(false)
      setNewGroupName('')
      toast.success('Group added.')
    },
    onError: () => toast.error('Failed to add group.'),
  })

  const renameGroup = useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      api.patch(`/workspaces/${workspace!.id}/boards/${boardId}/groups/${groupId}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', boardId] })
      setEditingGroupId(null)
    },
    onError: () => toast.error('Failed to rename group.'),
  })

  const deleteGroup = useMutation({
    mutationFn: (groupId: string) =>
      api.delete(`/workspaces/${workspace!.id}/boards/${boardId}/groups/${groupId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', boardId] })
      toast.success('Group deleted.')
    },
    onError: () => toast.error('Failed to delete group.'),
  })

  const renameColumn = useMutation({
    mutationFn: ({ columnId, name }: { columnId: string; name: string }) =>
      api.patch(`/workspaces/${workspace!.id}/boards/${boardId}/columns/${columnId}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', boardId] })
      setEditingColId(null)
    },
    onError: () => toast.error('Failed to rename column.'),
  })

  const deleteColumn = useMutation({
    mutationFn: (columnId: string) =>
      api.delete(`/workspaces/${workspace!.id}/boards/${boardId}/columns/${columnId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', boardId] })
      toast.success('Column deleted.')
    },
    onError: () => toast.error('Failed to delete column.'),
  })

  const addColumn = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${workspace!.id}/boards/${boardId}/columns`, {
        name: 'New Column',
        type: 'text',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', boardId] })
      toast.success('Column added.')
    },
    onError: () => toast.error('Failed to add column.'),
  })

  const handleConfirmDelete = () => {
    if (!confirmTarget) return
    if (confirmTarget.kind === 'group')  deleteGroup.mutate(confirmTarget.id)
    if (confirmTarget.kind === 'column') deleteColumn.mutate(confirmTarget.id)
    setConfirmTarget(null)
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Board link copied to clipboard.')
    } catch {
      toast.error('Could not copy link.')
    }
    setShareOpen(false)
  }

  if (!boardId) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        Board ID is missing.
      </div>
    )
  }

  if (boardLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        Board not found.
      </div>
    )
  }

  const groupManagement = (
    <div className="px-6 py-2 border-b border-[var(--color-glass-border)] flex items-center gap-2 flex-wrap">
      <span className="text-xs text-[var(--color-text-muted)] font-medium">Groups:</span>
      {[...(board.groups ?? [])].sort((a, b) => a.position - b.position).map(group => (
        <div key={group.id} className="flex items-center gap-1 group/g">
          {editingGroupId === group.id ? (
            <>
              <Input
                size="sm"
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') renameGroup.mutate({ groupId: group.id, name: editingName })
                  if (e.key === 'Escape') setEditingGroupId(null)
                }}
                className="w-28"
              />
              <Button variant="ghost" size="sm" iconOnly onClick={() => renameGroup.mutate({ groupId: group.id, name: editingName })}>
                <Check size={11} />
              </Button>
              <Button variant="ghost" size="sm" iconOnly onClick={() => setEditingGroupId(null)}>
                <X size={11} />
              </Button>
            </>
          ) : (
            <span
              className="text-xs bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded flex items-center gap-1"
              style={{ borderLeft: `3px solid ${group.color ?? '#6366f1'}` }}
            >
              <span
                className="cursor-pointer"
                onClick={() => { setEditingGroupId(group.id); setEditingName(group.name) }}
              >
                {group.name}
              </span>
              <div className="opacity-0 group-hover/g:opacity-100" onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" iconOnly className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                      <MoreVertical size={9} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuItems align="end">
                    <DropdownMenuItem
                      icon={Pencil}
                      label="Rename"
                      onClick={() => { setEditingGroupId(group.id); setEditingName(group.name) }}
                    />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      icon={Trash2}
                      label="Delete group"
                      onClick={() => setConfirmTarget({ kind: 'group', id: group.id, name: group.name })}
                      className="text-[var(--color-status-blocked)] hover:text-[var(--color-status-blocked)]"
                    />
                  </DropdownMenuItems>
                </DropdownMenu>
              </div>
            </span>
          )}
        </div>
      ))}

      {addingGroup ? (
        <div className="flex items-center gap-1">
          <Input
            size="sm"
            ref={newGroupRef}
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="Group name"
            onKeyDown={e => {
              if (e.key === 'Enter' && newGroupName.trim()) createGroup.mutate(newGroupName.trim())
              if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
            }}
            className="w-28"
          />
          <Button variant="ghost" size="sm" iconOnly onClick={() => newGroupName.trim() && createGroup.mutate(newGroupName.trim())}>
            <Check size={11} />
          </Button>
          <Button variant="ghost" size="sm" iconOnly onClick={() => { setAddingGroup(false); setNewGroupName('') }}>
            <X size={11} />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAddingGroup(true)}
        >
          <Plus size={11} /> Add group
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-2 border-b border-[var(--color-glass-border)] shrink-0">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex-1 truncate">{board.name}</h2>

        {/* Presence avatars */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center -space-x-1.5 mr-1" aria-label={`${onlineUsers.length} online`}>
            {onlineUsers.slice(0, 4).map(u => (
              <div
                key={u.userId}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                style={{
                  background: 'var(--color-accent)',
                  borderColor: 'var(--color-bg-base)',
                  color: '#fff',
                }}
                title={u.name}
              >
                {u.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            ))}
            {onlineUsers.length > 4 && (
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                style={{
                  background: 'var(--color-bg-elevated)',
                  borderColor: 'var(--color-bg-base)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                +{onlineUsers.length - 4}
              </div>
            )}
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShareOpen(true)}
          title="Share board"
          aria-label="Share board"
        >
          <Share2 size={13} /> <span className="hidden sm:inline">Share</span>
        </Button>
        <PrintButton label="Board" />
      </div>
      <BoardTopBar board={board} view={view} onViewChange={setView} onManageColumns={() => setShowColumns(true)} />
      {groupManagement}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban'     && <KanbanView     board={board} items={items} boardId={boardId!} />}
        {view === 'table'      && <TableView      board={board} items={items} boardId={boardId!} />}
        {view === 'calendar'   && <CalendarView   board={board} items={items} boardId={boardId!} />}
        {view === 'whiteboard' && <ExcalidrawView board={board} boardId={boardId!} />}
      </div>

      <Modal
        open={showColumns}
        onClose={() => setShowColumns(false)}
        title="Manage Columns"
        size="md"
      >
        <div className="space-y-2">
          {[...(board.columns ?? [])].sort((a, b) => a.position - b.position).map(col => (
            <div key={col.id} className="flex items-center gap-2 group/col">
              <GripVertical size={13} className="text-[var(--color-text-muted)] shrink-0" />
              {editingColId === col.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    size="sm"
                    value={editingColName}
                    onChange={e => setEditingColName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') renameColumn.mutate({ columnId: col.id, name: editingColName })
                      if (e.key === 'Escape') setEditingColId(null)
                    }}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" iconOnly onClick={() => renameColumn.mutate({ columnId: col.id, name: editingColName })}>
                    <Check size={11} />
                  </Button>
                  <Button variant="ghost" size="sm" iconOnly onClick={() => setEditingColId(null)}>
                    <X size={11} />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-xs text-[var(--color-text-primary)] truncate">{col.name}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase">{col.type}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => { setEditingColId(col.id); setEditingColName(col.name) }}
                    className="opacity-0 group-hover/col:opacity-100"
                  >
                    <Pencil size={10} />
                  </Button>
                  {!col.is_system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => setConfirmTarget({ kind: 'column', id: col.id, name: col.name })}
                      className="opacity-0 group-hover/col:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-status-blocked)]"
                    >
                      <Trash2 size={10} />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--color-glass-border)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addColumn.mutate()}
            disabled={addColumn.isPending}
          >
            <Plus size={12} /> Add column
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title={confirmTarget?.kind === 'group' ? 'Delete group' : 'Delete column'}
        description={
          confirmTarget
            ? `Are you sure you want to delete “${confirmTarget.name}”?${
                confirmTarget.kind === 'group' ? ' Items in this group will be unassigned.' : ''
              } This action cannot be undone.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              loading={deleteGroup.isPending || deleteColumn.isPending}
            >
              Delete
            </Button>
          </>
        }
      />

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share board"
        description="Copy the link below to share this board with anyone in your workspace."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShareOpen(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={handleShare}>
              Copy link
            </Button>
          </>
        }
      >
        <Input
          readOnly
          value={typeof window !== 'undefined' ? window.location.href : ''}
          onFocus={e => e.currentTarget.select()}
          containerClassName="!mb-0"
        />
      </Modal>
    </div>
  )
}

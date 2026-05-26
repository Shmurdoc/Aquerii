import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useBoard } from '@/hooks/useBoards'
import type { BoardColumn } from '@/hooks/useBoards'
import { useItems } from '@/hooks/useItems'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import BoardTopBar    from '@/components/board/BoardTopBar'
import KanbanView     from '@/components/board/KanbanView'
import TableView      from '@/components/board/TableView'
import CalendarView   from '@/components/board/CalendarView'
import ExcalidrawView from '@/components/board/ExcalidrawView'
import { Plus, Pencil, Trash2, Check, X, Columns3, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const workspace   = useAuthStore(s => s.workspace)
  const qc          = useQueryClient()
  const [view, setView] = useState<'kanban' | 'table' | 'calendar' | 'whiteboard'>('kanban')
  const [editingGroupId,  setEditingGroupId]  = useState<string | null>(null)
  const [editingName,     setEditingName]     = useState('')
  const [addingGroup,     setAddingGroup]     = useState(false)
  const [newGroupName,    setNewGroupName]    = useState('')
  const [confirmDelGroup, setConfirmDelGroup] = useState<string | null>(null)
  const [showColumns,     setShowColumns]     = useState(false)
  const [editingColId,    setEditingColId]    = useState<string | null>(null)
  const [editingColName,  setEditingColName]  = useState('')
  const newGroupRef = useRef<HTMLInputElement>(null)

  const { data: board, isLoading: boardLoading } = useBoard(boardId ?? '')
  const { data: items = [], isLoading: itemsLoading } = useItems(boardId ?? '')

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
      setConfirmDelGroup(null)
      toast.success('Group deleted.')
    },
    onError: () => toast.error('Failed to delete group.'),
  })

  // ── Column mutations ───────────────────────────────────────────
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

  if (!boardId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Board ID is missing.
      </div>
    )
  }

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

  const groupManagement = (
    <div className="px-6 py-2 border-b border-gray-800 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 font-medium">Groups:</span>
      {[...(board.groups ?? [])].sort((a, b) => a.position - b.position).map(group => (
        <div key={group.id} className="flex items-center gap-1 group/g">
          {editingGroupId === group.id ? (
            <>
              <input
                autoFocus
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') renameGroup.mutate({ groupId: group.id, name: editingName })
                  if (e.key === 'Escape') setEditingGroupId(null)
                }}
                className="text-xs bg-gray-800 border border-indigo-500 rounded px-2 py-0.5 text-white w-28 outline-none"
              />
              <button onClick={() => renameGroup.mutate({ groupId: group.id, name: editingName })}
                className="text-green-400 hover:text-green-300"><Check size={11} /></button>
              <button onClick={() => setEditingGroupId(null)}
                className="text-gray-500 hover:text-gray-300"><X size={11} /></button>
            </>
          ) : (
            <span
              className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded flex items-center gap-1"
              style={{ borderLeft: `3px solid ${group.color ?? '#6366f1'}` }}
            >
              {group.name}
              <button onClick={() => { setEditingGroupId(group.id); setEditingName(group.name) }}
                className="opacity-0 group-hover/g:opacity-100 ml-0.5 text-gray-500 hover:text-gray-300 transition-opacity">
                <Pencil size={9} />
              </button>
              {confirmDelGroup === group.id ? (
                <>
                  <button onClick={() => deleteGroup.mutate(group.id)}
                    className="text-red-400 hover:text-red-300 text-[10px]">del?</button>
                  <button onClick={() => setConfirmDelGroup(null)}
                    className="text-gray-500 hover:text-gray-300"><X size={9} /></button>
                </>
              ) : (
                <button onClick={() => setConfirmDelGroup(group.id)}
                  className="opacity-0 group-hover/g:opacity-100 text-gray-500 hover:text-red-400 transition-opacity">
                  <Trash2 size={9} />
                </button>
              )}
            </span>
          )}
        </div>
      ))}

      {addingGroup ? (
        <div className="flex items-center gap-1">
          <input
            ref={newGroupRef}
            autoFocus
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="Group name"
            onKeyDown={e => {
              if (e.key === 'Enter' && newGroupName.trim()) createGroup.mutate(newGroupName.trim())
              if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
            }}
            className="text-xs bg-gray-800 border border-indigo-500 rounded px-2 py-0.5 text-white w-28 outline-none placeholder-gray-600"
          />
          <button onClick={() => newGroupName.trim() && createGroup.mutate(newGroupName.trim())}
            className="text-green-400 hover:text-green-300"><Check size={11} /></button>
          <button onClick={() => { setAddingGroup(false); setNewGroupName('') }}
            className="text-gray-500 hover:text-gray-300"><X size={11} /></button>
        </div>
      ) : (
        <button
          onClick={() => setAddingGroup(true)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-400 transition-colors"
        >
          <Plus size={11} /> Add group
        </button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <BoardTopBar board={board} view={view} onViewChange={setView} onManageColumns={() => setShowColumns(true)} />
      {groupManagement}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban'     && <KanbanView     board={board} items={items} boardId={boardId!} />}
        {view === 'table'      && <TableView      board={board} items={items} boardId={boardId!} />}
        {view === 'calendar'   && <CalendarView   board={board} items={items} boardId={boardId!} />}
        {view === 'whiteboard' && <ExcalidrawView board={board} boardId={boardId!} />}
      </div>

      {/* ── Column Management Modal ─────────────────────────────── */}
      {showColumns && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={() => setShowColumns(false)}>
          <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
          <div
            className="relative z-10 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md max-h-[60vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Columns3 size={15} className="text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Manage Columns</h2>
              </div>
              <button onClick={() => setShowColumns(false)} className="text-gray-500 hover:text-gray-300">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {[...(board.columns ?? [])].sort((a, b) => a.position - b.position).map(col => (
                <div key={col.id} className="flex items-center gap-2 group/col">
                  <GripVertical size={13} className="text-gray-600 shrink-0" />
                  {editingColId === col.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        autoFocus
                        value={editingColName}
                        onChange={e => setEditingColName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renameColumn.mutate({ columnId: col.id, name: editingColName })
                          if (e.key === 'Escape') setEditingColId(null)
                        }}
                        className="flex-1 text-xs bg-gray-800 border border-indigo-500 rounded px-2 py-1 text-white outline-none"
                      />
                      <button onClick={() => renameColumn.mutate({ columnId: col.id, name: editingColName })}
                        className="text-green-400 hover:text-green-300"><Check size={11} /></button>
                      <button onClick={() => setEditingColId(null)}
                        className="text-gray-500 hover:text-gray-300"><X size={11} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-xs text-gray-300 truncate">{col.name}</span>
                      <span className="text-[10px] text-gray-600 uppercase">{col.type}</span>
                      <button
                        onClick={() => { setEditingColId(col.id); setEditingColName(col.name) }}
                        className="opacity-0 group-hover/col:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity"
                      >
                        <Pencil size={10} />
                      </button>
                      {!col.is_system && (
                        <button
                          onClick={() => { if (confirm('Delete this column?')) deleteColumn.mutate(col.id) }}
                          className="opacity-0 group-hover/col:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-800">
              <button
                onClick={() => addColumn.mutate()}
                disabled={addColumn.isPending}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors"
              >
                <Plus size={12} /> Add column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { Item } from '@/hooks/useItems'
import { format } from 'date-fns'
import { X, Calendar, User, Flag, Paperclip, MessageSquare, GitBranch, Trash2, Plus } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low']
const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10',
  high:     'text-orange-400 bg-orange-500/10',
  medium:   'text-yellow-400 bg-yellow-500/10',
  low:      'text-gray-400 bg-gray-500/10',
}

interface Props {
  item: Item
  boardId: string
  onClose: () => void
}

export default function ItemDetailModal({ item, boardId, onClose }: Props) {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()

  const [title,       setTitle]       = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [dueDate,     setDueDate]     = useState(item.due_date ?? '')
  const [priority,    setPriority]    = useState(item.priority ?? '')
  const [comment,     setComment]     = useState('')
  const titleRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow title
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
    }
  }, [title])

  // Comments
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', item.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/items/${item.id}/comments`)
      return res.data.data
    },
    enabled: !!workspace,
  })

  // Files
  const { data: files = [] } = useQuery({
    queryKey: ['files', item.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/items/${item.id}/files`)
      return res.data.data
    },
    enabled: !!workspace,
  })

  // Update item field
  const updateItem = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      api.patch(`/workspaces/${workspace!.id}/boards/${boardId}/items/${item.id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', boardId] })
    },
    onError: () => toast.error('Failed to update item.'),
  })

  // Add comment
  const addComment = useMutation({
    mutationFn: (body: string) =>
      api.post(`/workspaces/${workspace!.id}/items/${item.id}/comments`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', item.id] })
      setComment('')
    },
    onError: () => toast.error('Failed to post comment.'),
  })

  // Delete comment
  const deleteComment = useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/workspaces/${workspace!.id}/items/${item.id}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', item.id] }),
  })

  // Upload file
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post(`/workspaces/${workspace!.id}/items/${item.id}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', item.id] }),
    onError:   () => toast.error('Failed to upload file.'),
  })

  const handleTitleBlur = () => {
    if (title.trim() && title !== item.title) {
      updateItem.mutate({ title: title.trim() })
    }
  }

  const handleDescBlur = () => {
    if (description !== (item.description ?? '')) {
      updateItem.mutate({ description })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-3 border-b border-gray-800">
          <textarea
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            rows={1}
            className="flex-1 bg-transparent text-lg font-semibold text-white resize-none focus:outline-none placeholder-gray-600 leading-snug"
            placeholder="Item title…"
          />
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={handleDescBlur}
                rows={4}
                placeholder="Add a description…"
                className="mt-1.5 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Sub-items */}
            <SubItems itemId={item.id} boardId={boardId} workspaceId={workspace!.id} />

            {/* Files */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Paperclip size={11} /> Files
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  + Attach
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && uploadFile.mutate(e.target.files[0])}
                />
              </div>
              {files.length === 0 ? (
                <p className="text-xs text-gray-600">No files attached.</p>
              ) : (
                <div className="space-y-1">
                  {files.map((f: any) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 py-1"
                    >
                      <Paperclip size={11} />
                      {f.filename}
                      <span className="text-gray-600 ml-auto">{(f.size / 1024).toFixed(1)} KB</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <MessageSquare size={11} /> Comments
              </label>
              <div className="space-y-3 mb-3">
                {comments.map((c: any) => (
                  <div key={c.id} className="flex gap-2 group">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5">
                      {c.author?.name?.[0] ?? 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-gray-300">{c.author?.name}</span>
                        <span className="text-xs text-gray-600">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                        <button
                          onClick={() => deleteComment.mutate(c.id)}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-300 leading-snug whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && comment.trim()) {
                      addComment.mutate(comment.trim())
                    }
                  }}
                  placeholder="Write a comment… (Ctrl+Enter to submit)"
                  rows={2}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                <button
                  onClick={() => comment.trim() && addComment.mutate(comment.trim())}
                  disabled={!comment.trim()}
                  className="px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm transition-colors self-end py-2"
                >
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-52 border-l border-gray-800 px-4 py-4 space-y-5 flex-shrink-0 overflow-y-auto">

            {/* Priority */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Flag size={10} /> Priority
              </label>
              <div className="space-y-1">
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => { setPriority(p); updateItem.mutate({ priority: p }) }}
                    className={clsx(
                      'w-full text-left px-2 py-1 rounded text-xs font-medium capitalize transition-colors',
                      priority === p ? PRIORITY_COLOR[p] : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Calendar size={10} /> Due Date
              </label>
              <input
                type="date"
                value={dueDate ? dueDate.slice(0, 10) : ''}
                onChange={e => {
                  setDueDate(e.target.value)
                  updateItem.mutate({ due_date: e.target.value || null })
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Assignees */}
            <AssigneeSelector itemId={item.id} boardId={boardId} workspaceId={workspace!.id} current={item.assignees ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-items ──────────────────────────────────────────────────────────────────
function SubItems({ itemId, boardId, workspaceId }: { itemId: string; boardId: string; workspaceId: string }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const { data: subitems = [] } = useQuery({
    queryKey: ['subitems', itemId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/items/${itemId}/subitems`)
      return res.data.data
    },
  })

  const createSub = useMutation({
    mutationFn: (title: string) =>
      api.post(`/workspaces/${workspaceId}/items/${itemId}/subitems`, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subitems', itemId] })
      setNewTitle('')
      setAdding(false)
    },
    onError: () => toast.error('Failed to create sub-item.'),
  })

  const toggleDone = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/workspaces/${workspaceId}/boards/${boardId}/items/${id}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subitems', itemId] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <GitBranch size={11} /> Sub-items
          {subitems.length > 0 && (
            <span className="text-gray-600">({subitems.filter((s: any) => s.done).length}/{subitems.length})</span>
          )}
        </label>
        <button onClick={() => setAdding(true)} className="text-xs text-indigo-400 hover:text-indigo-300">
          + Add
        </button>
      </div>

      {subitems.length > 0 && (
        <div className="space-y-1 mb-2">
          {subitems.map((sub: any) => (
            <div key={sub.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sub.done ?? false}
                onChange={e => toggleDone.mutate({ id: sub.id, done: e.target.checked })}
                className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
              />
              <span className={clsx('text-sm', sub.done ? 'line-through text-gray-600' : 'text-gray-300')}>
                {sub.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newTitle.trim()) createSub.mutate(newTitle.trim())
              if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
            }}
            placeholder="Sub-item title…"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => newTitle.trim() && createSub.mutate(newTitle.trim())}
            className="px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Assignee Selector ──────────────────────────────────────────────────────────
function AssigneeSelector({
  itemId, boardId, workspaceId, current,
}: {
  itemId: string; boardId: string; workspaceId: string; current: any[]
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/members`)
      return res.data.data
    },
  })

  const assign = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}/assignees`, { user_id: userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })

  const unassign = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}/assignees/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })

  const currentIds = current.map(a => a.id)

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
        <User size={10} /> Assignees
      </label>

      {/* Current assignees */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {current.map(a => (
          <button
            key={a.id}
            onClick={() => unassign.mutate(a.id)}
            title={`Remove ${a.name}`}
            className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5 text-xs text-gray-300 hover:border-red-500/50 hover:text-red-400 transition-colors"
          >
            {a.name.split(' ')[0]}
            <X size={9} />
          </button>
        ))}
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-indigo-400 hover:text-indigo-300"
      >
        + Assign member
      </button>

      {open && (
        <div className="mt-2 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {members.map((m: any) => {
            const assigned = currentIds.includes(m.user_id)
            return (
              <button
                key={m.user_id}
                onClick={() => assigned ? unassign.mutate(m.user_id) : assign.mutate(m.user_id)}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-700 transition-colors',
                  assigned ? 'text-indigo-400' : 'text-gray-300'
                )}
              >
                <div className="w-5 h-5 rounded-full bg-indigo-700 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                  {m.user?.name?.[0] ?? 'U'}
                </div>
                {m.user?.name}
                {assigned && <span className="ml-auto text-indigo-500">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

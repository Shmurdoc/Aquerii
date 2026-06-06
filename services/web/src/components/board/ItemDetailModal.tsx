import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useItem, useUpdateItem, useDeleteItem } from '@/hooks/useItems'
import type { Item } from '@/hooks/useItems'
import { format } from 'date-fns'
import { X, Calendar, User, Flag, Paperclip, MessageSquare, GitBranch, Trash2, Plus, FileText, ExternalLink, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'

interface Comment {
  id: string
  author?: { name?: string; avatar_url?: string | null }
  body: string
  created_at: string
}

interface FileAttachment {
  id: string
  url: string
  filename: string
  size: number
}

interface SubItem {
  id: string
  title: string
  done: boolean
}

interface Document {
  id: string
  title?: string
  filename?: string
  url?: string
}

interface Deal {
  id: string
  name: string
}

function descriptionToText(raw: Item['description']): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  function extract(node: Record<string, unknown>): string {
    if (node.type === 'text') return (node.text as string) ?? ''
    const children = (node.content as Record<string, unknown>[] | undefined) ?? []
    return children.map(extract).join('')
  }
  return extract(raw)
}

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
  critical: 'danger',
  high:     'warning',
  medium:   'info',
  low:      'default',
}

interface Props {
  itemId: string
  boardId: string
  open: boolean
  onClose: () => void
  onDeleted?: () => void
}

export default function ItemDetailModal({ itemId, boardId, open, onClose, onDeleted }: Props) {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()

  const { data: item, isLoading, isError } = useItem(workspace?.id ?? '', boardId, itemId)

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [priority,    setPriority]    = useState('')
  const [status,      setStatus]      = useState('')
  const [comment,     setComment]     = useState('')
  const [showDelModal, setShowDelModal] = useState(false)
  const [dirty,       setDirty]       = useState(false)

  const updateItemMutation = useUpdateItem(boardId)

  const saveItem = useMutation({
    mutationFn: () =>
      updateItemMutation.mutateAsync({
        itemId,
        data: { title, description, due_date: dueDate || null, priority, status, expected_version: item?.version },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item', workspace!.id, boardId, itemId] })
      setDirty(false)
      toast.success('Item saved.')
    },
    onError: () => toast.error('Failed to save item.'),
  })

  const deleteItem = useMutation({
    mutationFn: () =>
      api.delete(`/workspaces/${workspace!.id}/boards/${boardId}/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', boardId] })
      toast.success('Item deleted.')
      if (onDeleted) onDeleted(); else onClose()
    },
    onError: () => toast.error('Failed to delete item.'),
  })

  // Sync local state when item data loads
  if (item && !dirty) {
    if (title !== item.title) setTitle(item.title)
    if (description !== descriptionToText(item.description)) setDescription(descriptionToText(item.description))
    if (dueDate !== (item.due_date ?? '')) setDueDate(item.due_date ?? '')
    if (priority !== (item.priority ?? '')) setPriority(item.priority ?? '')
    if (status !== (item.status ?? '')) setStatus(item.status ?? '')
  }

  const commentsQuery = useQuery({
    queryKey: ['comments', itemId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/items/${itemId}/comments`)
      return res.data.data
    },
    enabled: !!workspace && open,
  })
  const comments = commentsQuery.data as Comment[] | undefined ?? []

  const filesQuery = useQuery({
    queryKey: ['files', itemId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/items/${itemId}/files`)
      return res.data.data
    },
    enabled: !!workspace && open,
  })
  const files = filesQuery.data as FileAttachment[] | undefined ?? []

  const addComment = useMutation({
    mutationFn: (body: string) =>
      api.post(`/workspaces/${workspace!.id}/items/${itemId}/comments`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', itemId] })
      setComment('')
    },
    onError: () => toast.error('Failed to post comment.'),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/workspaces/${workspace!.id}/items/${itemId}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', itemId] }),
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post(`/workspaces/${workspace!.id}/items/${itemId}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', itemId] }),
    onError:   () => toast.error('Failed to upload file.'),
  })

  const handleFieldChange = (field: string, value: unknown) => {
    setDirty(true)
    switch (field) {
      case 'title': setTitle(value as string); break
      case 'description': setDescription(value as string); break
      case 'due_date': setDueDate(value as string); break
      case 'priority': setPriority(value as string); break
      case 'status': setStatus(value as string); break
    }
  }

  if (!open) return null

  return (
    <>
      <Modal
        open={showDelModal}
        onClose={() => setShowDelModal(false)}
        title="Delete item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowDelModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                deleteItem.mutate()
                setShowDelModal(false)
              }}
              loading={deleteItem.isPending}
            >
              Delete
            </Button>
          </>
        }
      />
    <Modal open={open} onClose={onClose} size="full">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-500" />
        </div>
      ) : isError || !item ? (
        <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
          Failed to load item.
        </div>
      ) : (
        <div className="flex flex-col max-h-[80vh]">
          <div className="flex items-start gap-4 pb-1">
            <div className="flex-1 space-y-3">
              <Input
                value={title}
                onChange={e => handleFieldChange('title', e.target.value)}
                placeholder="Item title…"
                className="text-lg font-semibold"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {item.priority && (
                  <Badge variant={PRIORITY_VARIANT[item.priority] ?? 'default'} size="sm">
                    <Flag size={10} />
                    {item.priority}
                  </Badge>
                )}
                {item.status && (
                  <Badge variant="primary" size="sm">
                    {item.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-5 pr-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
                <textarea
                  value={description}
                  onChange={e => handleFieldChange('description', e.target.value)}
                  rows={4}
                  placeholder="Add a description…"
                  className="mt-1.5 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <SubItems itemId={itemId} boardId={boardId} workspaceId={workspace!.id} />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Paperclip size={11} /> Files
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                    + Attach
                  </Button>
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
                    {files.map((f: FileAttachment) => (
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

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <MessageSquare size={11} /> Comments
                </label>
                <div className="space-y-3 mb-3">
                  {comments.map((c: Comment) => (
                    <div key={c.id} className="flex gap-2 group">
                      <Avatar name={c.author?.name} size="xs" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-300">{c.author?.name}</span>
                          <span className="text-xs text-gray-600">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            onClick={() => deleteCommentMutation.mutate(c.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={11} />
                          </Button>
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
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => comment.trim() && addComment.mutate(comment.trim())}
                    disabled={!comment.trim()}
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>

            <div className="w-56 border-l border-gray-800 pl-4 space-y-5 flex-shrink-0 overflow-y-auto">
              <div>
                <Select
                  label="Status"
                  size="sm"
                  value={status}
                  onChange={e => handleFieldChange('status', e.target.value)}
                >
                  <option value="">None</option>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </Select>
              </div>

              <div>
                <Select
                  label="Priority"
                  size="sm"
                  value={priority}
                  onChange={e => handleFieldChange('priority', e.target.value)}
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>

              <Input
                label="Due Date"
                type="date"
                size="sm"
                value={dueDate ? dueDate.slice(0, 10) : ''}
                onChange={e => handleFieldChange('due_date', e.target.value)}
              />

              <LinkedDocuments itemId={itemId} workspaceId={workspace!.id} />

              <AssigneeSelector itemId={itemId} boardId={boardId} workspaceId={workspace!.id} current={item.assignees ?? []} />

              <div className="pt-3 border-t border-gray-800 space-y-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => saveItem.mutate()}
                  loading={saveItem.isPending}
                  disabled={!dirty}
                >
                  Save
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => setShowDelModal(true)}
                >
                  <Trash2 size={11} /> Delete item
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
    </>
  )
}

function SubItems({ itemId, boardId, workspaceId }: { itemId: string; boardId: string; workspaceId: string }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const updateItem = useUpdateItem(boardId)

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
      updateItem.mutateAsync({ itemId: id, data: { done } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subitems', itemId] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <GitBranch size={11} /> Sub-items
          {subitems.length > 0 && (
            <span className="text-gray-600">({subitems.filter((s: SubItem) => s.done).length}/{subitems.length})</span>
          )}
        </label>
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
          + Add
        </Button>
      </div>

      {subitems.length > 0 && (
        <div className="space-y-1 mb-2">
          {subitems.map((sub: SubItem) => (
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
          <Input
            size="sm"
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newTitle.trim()) createSub.mutate(newTitle.trim())
              if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
            }}
            placeholder="Sub-item title…"
            className="flex-1"
          />
          <Button variant="primary" size="sm" iconOnly onClick={() => newTitle.trim() && createSub.mutate(newTitle.trim())}>
            <Plus size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}

function LinkedDocuments({ itemId, workspaceId }: { itemId: string; workspaceId: string }) {
  const qc = useQueryClient()

  const { data: documents = [] } = useQuery({
    queryKey: ['item-documents', itemId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/items/${itemId}/documents`)
      return res.data.data
    },
    enabled: !!workspaceId,
  })

  const { data: deals = [] } = useQuery({
    queryKey: ['item-deals', itemId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/items/${itemId}/deals`)
      return res.data.data
    },
    enabled: !!workspaceId,
  })

  const unlinkDocument = useMutation({
    mutationFn: (docId: string) =>
      api.delete(`/workspaces/${workspaceId}/items/${itemId}/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['item-documents', itemId] }),
    onError: () => toast.error('Failed to unlink document.'),
  })

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
        <FileText size={10} /> Documents
      </label>
      {documents.length === 0 && deals.length === 0 ? (
        <p className="text-xs text-gray-600">None linked.</p>
      ) : (
        <div className="space-y-1">
          {documents.map((d: Document) => (
            <div key={d.id} className="flex items-center gap-1 group">
              <FileText size={10} className="text-gray-500 flex-shrink-0" />
              <span className="text-xs text-indigo-400 truncate flex-1">{d.title ?? d.filename ?? 'Untitled'}</span>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => unlinkDocument.mutate(d.id)}
                className="opacity-0 group-hover:opacity-100"
              >
                <X size={10} />
              </Button>
            </div>
          ))}
          {deals.length > 0 && (
            <>
              <div className="text-[10px] text-gray-600 font-medium pt-1">Linked Deals</div>
              {deals.map((d: Deal) => (
                <div key={d.id} className="flex items-center gap-1">
                  <ExternalLink size={10} className="text-blue-500 flex-shrink-0" />
                  <span className="text-xs text-blue-400 truncate flex-1">{d.name}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function AssigneeSelector({
  itemId, boardId, workspaceId, current,
}: {
  itemId: string; boardId: string; workspaceId: string; current: Item['assignees']
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

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(o => !o)}
      >
        + Assign member
      </Button>

      {open && (
        <div className="mt-2 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {members.map((m: { user_id: string; user?: { name?: string; avatar_url?: string | null } }) => {
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

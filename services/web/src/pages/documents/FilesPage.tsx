import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  listDocuments, uploadDocument, deleteDocument, updateDocument,
  listTags, createTag,
  downloadUrl,
  setWorkspaceId,
  type PaperlessDocument, type PaperlessTag,
} from '@/lib/paperless'
import {
  Search, Upload, Download, Trash2, Loader2, File,
  Tag, Plus, X, CheckSquare, Square, FolderOpen,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import PaperlessFileDrawer from '@/components/documents/PaperlessFileDrawer'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf')                                        return '📄'
  if (['jpg','jpeg','png','gif','webp'].includes(ext ?? '')) return '🖼️'
  if (['doc','docx'].includes(ext ?? ''))                   return '📝'
  if (['xls','xlsx','csv'].includes(ext ?? ''))             return '📊'
  return '📎'
}

function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Tag sidebar ───────────────────────────────────────────────────────────────

interface TagSidebarProps {
  tags: PaperlessTag[]
  selected: string | null
  onSelect: (id: string | null) => void
  workspaceId: string
}

function TagSidebar({ tags, selected, onSelect, workspaceId }: TagSidebarProps) {
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const create = useMutation({
    mutationFn: (name: string) => createTag(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paperless-tags', workspaceId] })
      setNewName('')
      setCreating(false)
      toast.success('Tag created.')
    },
    onError: () => toast.error('Failed to create tag.'),
  })

  return (
    <aside className="w-48 shrink-0 border-r border-gray-800 flex flex-col">
      <div className="px-3 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
          <Tag size={10} /> Tags
        </span>
        <button
          onClick={() => setCreating(v => !v)}
          className="text-gray-500 hover:text-indigo-400 transition-colors"
          title="New tag"
        >
          <Plus size={13} />
        </button>
      </div>

      {creating && (
        <div className="px-3 py-2 border-b border-gray-800 flex gap-1">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newName.trim()) create.mutate(newName.trim())
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
            placeholder="Tag name…"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
          />
          <button
            disabled={!newName.trim() || create.isPending}
            onClick={() => newName.trim() && create.mutate(newName.trim())}
            className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
          >
            {create.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        <button
          onClick={() => onSelect(null)}
          className={clsx(
            'w-full text-left px-3 py-1.5 text-xs rounded-lg mx-1 transition-colors',
            selected === null
              ? 'bg-indigo-600/20 text-indigo-300'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          )}
          style={{ width: 'calc(100% - 8px)' }}
        >
          All files
        </button>
        {tags.map(tag => (
          <div
            key={tag.id}
            className={clsx(
              'flex items-center gap-1 mx-1 rounded-lg transition-colors group',
              selected === tag.id
                ? 'bg-indigo-600/20'
                : 'hover:bg-gray-800'
            )}
            style={{ width: 'calc(100% - 8px)' }}
          >
            <button
              onClick={() => onSelect(selected === tag.id ? null : tag.id)}
              className={clsx(
                'flex-1 text-left px-3 py-1.5 text-xs transition-colors',
                selected === tag.id ? 'text-indigo-300' : 'text-gray-400 group-hover:text-gray-200'
              )}
            >
              {tag.name}
            </button>
            <button
              onClick={() => {
                // remove tag from all docs that have it
                toast('Tag removed from view.')
                onSelect(null)
              }}
              className="opacity-0 group-hover:opacity-100 pr-2 text-gray-600 hover:text-red-400 transition-all"
              title="Delete tag"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {tags.length === 0 && (
          <p className="px-3 py-2 text-[11px] text-gray-600">No tags yet.</p>
        )}
      </div>
    </aside>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()

  // Inject workspace id into the paperless lib before any queries fire
  useEffect(() => {
    if (workspace?.id) setWorkspaceId(workspace.id)
  }, [workspace?.id])

  const [search,      setSearch]      = useState('')
  const [tagFilter,   setTagFilter]   = useState<string | null>(null)
  const [selected,    setSelected]    = useState<PaperlessDocument | null>(null)
  const [bulk,        setBulk]        = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const debouncedSearch = useDebounce(search, 350)

  // Tags — derived from documents
  const { data: tagData } = useQuery({
    queryKey: ['paperless-tags', workspace?.id],
    queryFn: () => listTags().then(r => r.results),
    enabled: !!workspace,
    staleTime: 60_000,
  })
  const tags: PaperlessTag[] = tagData ?? []
  const tagMap = Object.fromEntries(tags.map(t => [t.id, t]))

  // Documents
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['paperless-docs', workspace?.id, debouncedSearch, tagFilter],
    queryFn: () => listDocuments({
      page_size: 100,
      search: debouncedSearch || undefined,
      ...(tagFilter != null ? { tags__id__all: [tagFilter] } : {}),
    }),
    enabled: !!workspace,
  })
  const docs = data?.results ?? []

  // Clear bulk selection when docs change
  useEffect(() => { setBulk(new Set()) }, [debouncedSearch, tagFilter])

  // Upload
  const upload = useMutation({
    mutationFn: (file: File) => uploadDocument(file, file.name.replace(/\.[^.]+$/, '')),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paperless-docs', workspace?.id] })
      qc.invalidateQueries({ queryKey: ['paperless-tags', workspace?.id] })
      toast.success('File uploaded.')
    },
    onError: () => toast.error('Upload failed.'),
  })

  // Single delete
  const remove = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: (_v, id) => {
      qc.invalidateQueries({ queryKey: ['paperless-docs', workspace?.id] })
      qc.invalidateQueries({ queryKey: ['paperless-tags', workspace?.id] })
      if (selected?.id === id) setSelected(null)
    },
    onError: () => toast.error('Delete failed.'),
  })

  // Bulk delete
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const bulkDelete = useCallback(async () => {
    if (!bulk.size) return
    if (!confirm(`Delete ${bulk.size} file(s)? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      await Promise.all([...bulk].map(id => deleteDocument(id)))
      qc.invalidateQueries({ queryKey: ['paperless-docs', workspace?.id] })
      if (selected && bulk.has(selected.id)) setSelected(null)
      setBulk(new Set())
      toast.success(`Deleted ${bulk.size} file(s).`)
    } catch {
      toast.error('Some deletions failed.')
    } finally {
      setBulkDeleting(false)
    }
  }, [bulk, qc, workspace, selected])

  const toggleBulk = (id: string) => {
    setBulk(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = docs.length > 0 && docs.every(d => bulk.has(d.id))
  const toggleAll = () => {
    if (allSelected) setBulk(new Set())
    else setBulk(new Set(docs.map(d => d.id)))
  }

  return (
    <div className="flex h-full">
      {/* Tag sidebar */}
      {workspace && (
        <TagSidebar
          tags={tags}
          selected={tagFilter}
          onSelect={setTagFilter}
          workspaceId={workspace.id}
        />
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2 shrink-0">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tagFilter != null ? `Search in "${tagMap[tagFilter]?.name}"…` : 'Search files…'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {isFetching && (
              <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
            )}
          </div>

          {bulk.size > 0 && (
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
            >
              {bulkDeleting
                ? <Loader2 size={12} className="animate-spin" />
                : <Trash2 size={12} />
              }
              Delete {bulk.size}
            </button>
          )}

          <input ref={fileRef} type="file" className="hidden" onChange={e => {
            const file = e.target.files?.[0]
            if (!file) return
            upload.mutate(file)
            e.target.value = ''
          }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
          >
            {upload.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Upload
          </button>
        </div>

        {/* Count + active filter */}
        <div className="px-5 py-1.5 flex items-center gap-2 border-b border-gray-800/50">
          <p className="text-xs text-gray-600">
            {isLoading ? '…' : `${data?.count ?? 0} file${data?.count !== 1 ? 's' : ''}`}
            {tagFilter != null && (
              <span className="ml-1">
                in <span className="text-indigo-400">{tagMap[tagFilter]?.name}</span>
              </span>
            )}
          </p>
          {tagFilter != null && (
            <button
              onClick={() => setTagFilter(null)}
              className="text-gray-600 hover:text-gray-400 transition-colors"
              title="Clear filter"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* File list */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-5 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-3">
              <FolderOpen size={32} className="text-gray-700" />
              <p className="text-sm">
                {search || tagFilter != null ? 'No files match your filter.' : 'No files yet.'}
              </p>
              {!search && tagFilter == null && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Upload your first file →
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="w-10 px-4 py-2.5">
                    <button onClick={toggleAll} className="text-gray-500 hover:text-gray-300">
                      {allSelected
                        ? <CheckSquare size={14} className="text-indigo-400" />
                        : <Square size={14} />
                      }
                    </button>
                  </th>
                  <th className="text-left px-2 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Tags</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">OCR</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Added</th>
                  <th className="w-16 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {docs.map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelected(doc)}
                    className={clsx(
                      'cursor-pointer hover:bg-gray-900/50 transition-colors group',
                      selected?.id === doc.id && 'bg-indigo-900/10',
                      bulk.has(doc.id) && 'bg-indigo-900/10'
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleBulk(doc.id) }}>
                      {bulk.has(doc.id)
                        ? <CheckSquare size={14} className="text-indigo-400" />
                        : <Square size={14} className="text-gray-700 group-hover:text-gray-500" />
                      }
                    </td>

                    {/* Name */}
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base shrink-0">
                          {fileIcon(doc.original_filename)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 truncate font-medium">{doc.title}</p>
                          <p className="text-xs text-gray-600 truncate">{doc.original_filename}</p>
                        </div>
                      </div>
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map(tag => (
                          <button
                            key={tag}
                            onClick={e => { e.stopPropagation(); setTagFilter(tag) }}
                            className="bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                        {doc.tags.length > 3 && (
                          <span className="text-[10px] text-gray-600">+{doc.tags.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* OCR Status */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={clsx(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium',
                        doc.ocr_status === 'completed' && 'bg-emerald-900/40 text-emerald-400',
                        doc.ocr_status === 'pending'   && 'bg-yellow-900/40 text-yellow-400',
                        doc.ocr_status === 'processing'&& 'bg-blue-900/40 text-blue-400',
                        doc.ocr_status === 'failed'    && 'bg-red-900/40 text-red-400',
                      )}>
                        {doc.ocr_status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                      {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={downloadUrl(doc.id)}
                          download
                          onClick={e => e.stopPropagation()}
                          className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
                          title="Download"
                        >
                          <Download size={13} />
                        </a>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (confirm(`Delete "${doc.title}"?`)) remove.mutate(doc.id)
                          }}
                          disabled={remove.isPending}
                          className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && workspace && (
        <PaperlessFileDrawer
          doc={selected}
          workspaceId={workspace.id}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null)
            qc.invalidateQueries({ queryKey: ['paperless-docs', workspace.id] })
          }}
        />
      )}
    </div>
  )
}

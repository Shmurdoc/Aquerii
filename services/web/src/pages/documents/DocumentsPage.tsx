import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  downloadUrl,
  thumbnailUrl,
  type PaperlessDocument,
} from '@/lib/paperless'
import {
  Plus, FileText, Upload, Download, Trash2, Search,
  Loader2, File, ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── PaperlessFileDrawer (inline, lazy) ─────────────────────────────────────
import PaperlessFileDrawer from '@/components/documents/PaperlessFileDrawer'

type Tab = 'notes' | 'files'

// ── Helpers ─────────────────────────────────────────────────────────────────
function humanSize(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['pdf'].includes(ext ?? ''))                    return '📄'
  if (['jpg','jpeg','png','gif','webp'].includes(ext ?? '')) return '🖼️'
  if (['doc','docx'].includes(ext ?? ''))             return '📝'
  if (['xls','xlsx','csv'].includes(ext ?? ''))       return '📊'
  return '📎'
}

// ── Notes tab ───────────────────────────────────────────────────────────────
function NotesTab() {
  const workspace = useAuthStore(s => s.workspace)
  const navigate  = useNavigate()
  const qc        = useQueryClient()

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/documents`)
      return res.data.data
    },
    enabled: !!workspace,
  })

  const createDoc = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspace!.id}/documents`, { title: 'Untitled' }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['documents', workspace?.id] })
      navigate(`/documents/${res.data.data.id}`)
    },
    onError: () => toast.error('Failed to create note.'),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          {docs.length} note{docs.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => createDoc.mutate()}
          disabled={createDoc.isPending}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {createDoc.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          New Note
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-11 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <FileText size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No notes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {docs.map((doc: any) => (
            <button
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-left group"
            >
              <span className="text-base">{doc.icon ?? '📄'}</span>
              <span className="flex-1 text-sm text-gray-200 group-hover:text-white truncate">
                {doc.title}
              </span>
              <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
              <span className="text-xs text-gray-600 shrink-0">
                {format(new Date(doc.updated_at), 'MMM d')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Files tab (paperless-ngx) ────────────────────────────────────────────────
function FilesTab() {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()

  const [search, setSearch]         = useState('')
  const [selectedDoc, setSelected]  = useState<PaperlessDocument | null>(null)
  const fileRef                     = useRef<HTMLInputElement>(null)

  // Debounce search — simple approach: query key changes on Enter or clear
  const [activeSearch, setActiveSearch] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['paperless-docs', workspace?.id, activeSearch],
    queryFn: () => listDocuments({ page_size: 50, search: activeSearch || undefined }),
    enabled: !!workspace,
  })

  const docs = data?.results ?? []

  const upload = useMutation({
    mutationFn: (file: File) => uploadDocument(file, file.name.replace(/\.[^.]+$/, '')),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paperless-docs', workspace?.id] })
      toast.success('File uploaded.')
    },
    onError: () => toast.error('Upload failed.'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paperless-docs', workspace?.id] })
      if (selectedDoc) setSelected(null)
      toast.success('File deleted.')
    },
    onError: () => toast.error('Delete failed.'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    upload.mutate(file)
    e.target.value = ''
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setActiveSearch(search) }}
            onBlur={() => setActiveSearch(search)}
            placeholder="Search files…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {isFetching && (
            <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
          )}
        </div>

        {/* Upload */}
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {upload.isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <Upload size={12} />
          }
          Upload
        </button>
      </div>

      {/* Count */}
      {data && (
        <p className="text-xs text-gray-500 mb-3">
          {data.count} file{data.count !== 1 ? 's' : ''}
          {activeSearch && ` matching "${activeSearch}"`}
        </p>
      )}

      {/* File list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <File size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No files found.</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300"
          >
            Upload your first file →
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {docs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelected(doc)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group',
                selectedDoc?.id === doc.id
                  ? 'bg-indigo-600/20 border border-indigo-500/30'
                  : 'hover:bg-gray-800 border border-transparent'
              )}
            >
              <span className="text-lg shrink-0">
                <img
                  src={thumbnailUrl(doc.id)}
                  alt=""
                  className="w-6 h-6 rounded object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden') }}
                />
                <span className="hidden">{fileIcon(doc.original_filename)}</span>
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate group-hover:text-white">
                  {doc.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{doc.original_filename}</p>
              </div>

              <span className="text-xs text-gray-600 shrink-0">
                {format(new Date(doc.created_at), 'MMM d, yyyy')}
              </span>

              {/* Quick actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <a
                  href={downloadUrl(doc.id)}
                  download
                  onClick={e => e.stopPropagation()}
                  className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                  title="Download"
                >
                  <Download size={13} />
                </a>
                <button
                  onClick={e => { e.stopPropagation(); remove.mutate(doc.id) }}
                  disabled={remove.isPending}
                  className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selectedDoc && workspace && (
        <PaperlessFileDrawer
          doc={selectedDoc}
          workspaceId={workspace.id}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null)
            qc.invalidateQueries({ queryKey: ['paperless-docs', workspace?.id] })
            toast.success('File deleted.')
          }}
        />
      )}
    </div>
  )
}

// ── Page shell ───────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [tab, setTab] = useState<Tab>('notes')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white mb-3">Documents</h1>

        {/* Tabs */}
        <div className="flex gap-0">
          {(['notes', 'files'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
                tab === t
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === 'notes' ? <NotesTab /> : <FilesTab />}
      </div>
    </div>
  )
}

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
import { Button, Input } from '@/components/ui'

import PaperlessFileDrawer from '@/components/documents/PaperlessFileDrawer'

type Tab = 'notes' | 'files'

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
        <span className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {docs.length} note{docs.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={() => createDoc.mutate()} disabled={createDoc.isPending}>
          {createDoc.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          New Note
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-11 rounded-lg animate-pulse" style={{ background: 'var(--color-bg-hover)' }} />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <FileText size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No notes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {docs.map((doc: any) => (
            <button
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <span className="text-base">{doc.icon ?? '📄'}</span>
              <span className="flex-1 text-sm truncate group-hover:opacity-80" style={{ color: 'var(--color-text-primary)' }}>
                {doc.title}
              </span>
              <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                {format(new Date(doc.updated_at), 'MMM d')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FilesTab() {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()

  const [search, setSearch]         = useState('')
  const [selectedDoc, setSelected]  = useState<PaperlessDocument | null>(null)
  const fileRef                     = useRef<HTMLInputElement>(null)

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
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setActiveSearch(search) }}
            onBlur={() => setActiveSearch(search)}
            placeholder="Search files…"
            className="w-full rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none transition-colors"
            style={{
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {isFetching && (
            <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin"
              style={{ color: 'var(--color-text-muted)' }} />
          )}
        </div>

        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
        <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          Upload
        </Button>
      </div>

      {data && (
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {data.count} file{data.count !== 1 ? 's' : ''}
          {activeSearch && ` matching "${activeSearch}"`}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--color-bg-hover)' }} />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <File size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No files found.</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 text-xs"
            style={{ color: 'var(--color-accent-text)' }}
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
              )}
              style={selectedDoc?.id === doc.id
                ? { background: 'var(--color-accent-light)', border: '1px solid var(--color-accent)' }
                : { border: '1px solid transparent' }
              }
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
                <p className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {doc.title}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{doc.original_filename}</p>
              </div>

              <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                {format(new Date(doc.created_at), 'MMM d, yyyy')}
              </span>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <a
                  href={downloadUrl(doc.id)}
                  download
                  onClick={e => e.stopPropagation()}
                  className="p-1 rounded"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Download"
                >
                  <Download size={13} />
                </a>
                <button
                  onClick={e => { e.stopPropagation(); remove.mutate(doc.id) }}
                  disabled={remove.isPending}
                  className="p-1 rounded"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

export default function DocumentsPage() {
  const [tab, setTab] = useState<Tab>('notes')

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
        <h1 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Documents</h1>

        <div className="flex gap-0">
          {(['notes', 'files'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
              )}
              style={tab === t
                ? { borderColor: 'var(--color-accent)', color: 'var(--color-text-primary)' }
                : { borderColor: 'transparent', color: 'var(--color-text-muted)' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6" style={{ background: 'var(--color-bg-base)' }}>
        {tab === 'notes' ? <NotesTab /> : <FilesTab />}
      </div>
    </div>
  )
}

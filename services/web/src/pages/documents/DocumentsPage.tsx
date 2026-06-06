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
  Loader2, File, ChevronRight, Folder, FolderOpen, MoreVertical, Pencil, Check, X,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Button, Input } from '@/components/ui'
import { useDocumentFolders, useCreateFolder, useRenameFolder, useDeleteFolder, type DocumentFolder } from '@/hooks/useDocuments'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuItems, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'

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

function FolderTree({ folders, parentId, selectedId, onSelect, onRename, onDelete, onContextEdit }:
  { folders: DocumentFolder[]; parentId: string | null; selectedId: string | null; onSelect: (id: string | null) => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void; onContextEdit: (id: string, name: string) => void }) {
  const children = folders.filter(f => f.parent_id === parentId).sort((a, b) => a.position - b.position)
  if (children.length === 0) return null

  return (
    <div className="space-y-0.5">
      {children.map(folder => (
        <FolderItem key={folder.id} folder={folder} folders={folders} selectedId={selectedId}
          onSelect={onSelect} onRename={onRename} onDelete={onDelete} onContextEdit={onContextEdit} />
      ))}
    </div>
  )
}

function FolderItem({ folder, folders, selectedId, onSelect, onRename, onDelete, onContextEdit }:
  { folder: DocumentFolder; folders: DocumentFolder[]; selectedId: string | null; onSelect: (id: string | null) => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void; onContextEdit: (id: string, name: string) => void }) {
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState(folder.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasChildren = folders.some(f => f.parent_id === folder.id)
  const isSelected = selectedId === folder.id

  const handleRename = () => {
    if (renameDraft.trim() && renameDraft !== folder.name) {
      onRename(folder.id, renameDraft.trim())
    }
    setRenaming(false)
  }

  return (
    <div>
      <div
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors group',
          isSelected
            ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
        )}
        onClick={() => onSelect(isSelected ? null : folder.id)}
      >
        {hasChildren ? <FolderOpen size={14} className="shrink-0" /> : <Folder size={14} className="shrink-0" />}
        {renaming ? (
          <input
            ref={inputRef}
            value={renameDraft}
            onChange={e => setRenameDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
            onBlur={handleRename}
            className="flex-1 min-w-0 bg-transparent outline-none text-xs border-b border-[var(--color-accent)]"
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate text-xs">{folder.name}</span>
        )}
        {!renaming && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex" onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-0.5 rounded hover:bg-[var(--color-bg-hover)]">
                  <MoreVertical size={11} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuItems align="start">
                <DropdownMenuItem icon={Pencil} label="Rename" onClick={() => { setRenaming(true); setRenameDraft(folder.name); setTimeout(() => inputRef.current?.focus(), 0) }} />
                <DropdownMenuSeparator />
                <DropdownMenuItem icon={Trash2} label="Delete" onClick={() => { if (confirm('Delete this folder? Documents inside will be unlinked.')) onDelete(folder.id) }} className="text-red-400 hover:text-red-300" />
              </DropdownMenuItems>
            </DropdownMenu>
          </div>
        )}
      </div>
      {hasChildren && (
        <div className="ml-3 mt-0.5 border-l border-[var(--color-glass-border)] pl-1">
          <FolderTree folders={folders} parentId={folder.id} selectedId={selectedId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} onContextEdit={onContextEdit} />
        </div>
      )}
    </div>
  )
}

function FolderSidebar({ selectedFolderId, onSelectFolder }: { selectedFolderId: string | null; onSelectFolder: (id: string | null) => void }) {
  const { data: folders = [] } = useDocumentFolders()
  const createFolder = useCreateFolder()
  const renameFolder = useRenameFolder()
  const deleteFolder = useDeleteFolder()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    createFolder.mutate({ name, parent_id: selectedFolderId ?? undefined })
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="w-56 shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-bg-surface)' }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Folders</span>
        <button
          onClick={() => setAdding(true)}
          className="p-0.5 rounded hover:bg-[var(--color-bg-hover)]"
          style={{ color: 'var(--color-text-muted)' }}
          title="New Folder"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-1.5 space-y-0.5">
        <div
          onClick={() => onSelectFolder(null)}
          className={clsx(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors',
            selectedFolderId === null
              ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
          )}
        >
          <FolderOpen size={14} className="shrink-0" />
          <span className="text-xs">All Documents</span>
        </div>

        <FolderTree folders={folders} parentId={null} selectedId={selectedFolderId} onSelect={onSelectFolder}
          onRename={(id, name) => renameFolder.mutate({ folderId: id, name })}
          onDelete={(id) => deleteFolder.mutate(id)}
          onContextEdit={() => {}} />

        {adding && (
          <div className="flex items-center gap-1 px-2 py-1">
            <input
              ref={inputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setAdding(false); setNewName('') } }}
              placeholder="Folder name"
              className="flex-1 min-w-0 bg-transparent text-xs outline-none border-b border-[var(--color-accent)]"
              style={{ color: 'var(--color-text-primary)' }}
              autoFocus
            />
            <button onClick={handleCreate} className="p-0.5 rounded hover:bg-[var(--color-bg-hover)]" style={{ color: 'var(--color-accent-text)' }}><Check size={11} /></button>
            <button onClick={() => { setAdding(false); setNewName('') }} className="p-0.5 rounded hover:bg-[var(--color-bg-hover)]" style={{ color: 'var(--color-text-muted)' }}><X size={11} /></button>
          </div>
        )}
      </div>
    </div>
  )
}

function NotesTab({ folderId }: { folderId: string | null }) {
  const workspace = useAuthStore(s => s.workspace)
  const navigate  = useNavigate()
  const qc        = useQueryClient()

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', workspace?.id, folderId],
    queryFn: async () => {
      const params = folderId ? { folder_id: folderId } : {}
      const res = await api.get(`/workspaces/${workspace!.id}/documents`, { params })
      return res.data.data
    },
    enabled: !!workspace,
  })

  const createDoc = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspace!.id}/documents`, { title: 'Untitled', folder_id: folderId ?? undefined }),
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
          <p className="text-sm">No notes{folderId ? ' in this folder' : ' yet'}. Create one to get started.</p>
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
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  return (
    <div className="flex h-full">
      <FolderSidebar selectedFolderId={selectedFolderId} onSelectFolder={setSelectedFolderId} />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="px-6 pt-5 pb-0 border-b shrink-0" style={{ borderColor: 'var(--color-glass-border)' }}>
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
          {tab === 'notes' ? <NotesTab folderId={selectedFolderId} /> : <FilesTab />}
        </div>
      </div>
    </div>
  )
}

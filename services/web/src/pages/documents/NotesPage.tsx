import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Plus, FileText, ChevronRight, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function NotesPage() {
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
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3 shrink-0">
        <h1 className="text-sm font-semibold text-white flex-1">Notes</h1>
        <button
          onClick={() => createDoc.mutate()}
          disabled={createDoc.isPending}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {createDoc.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          New Note
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
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
                <span className="text-xs text-gray-600 shrink-0">
                  {format(new Date(doc.updated_at), 'MMM d')}
                </span>
                <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Plus, FileText } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function DocumentsPage() {
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
    onError: () => toast.error('Failed to create document.'),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Documents</h1>
        <button
          onClick={() => createDoc.mutate()}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} />
          New Document
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <FileText size={40} className="mb-3 opacity-40" />
          <p className="text-sm">No documents yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {docs.map((doc: any) => (
            <button
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-left group"
            >
              <span className="text-lg">{doc.icon ?? '📄'}</span>
              <span className="flex-1 text-sm text-gray-200 group-hover:text-white truncate">{doc.title}</span>
              <span className="text-xs text-gray-600">
                {format(new Date(doc.updated_at), 'MMM d')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

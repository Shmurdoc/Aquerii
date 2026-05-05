import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { getSocket } from '@/lib/socket'
import * as Y from 'yjs'
import { BlockNoteEditor } from '@blocknote/core'
import { BlockNoteView, useCreateBlockNote } from '@blocknote/react'
import '@blocknote/react/style.css'

export default function DocumentPage() {
  const { docId }   = useParams<{ docId: string }>()
  const workspace   = useAuthStore(s => s.workspace)
  const ydoc        = useMemo(() => new Y.Doc(), [docId])
  const synced      = useRef(false)

  // Load document metadata
  const { data: doc } = useQuery({
    queryKey: ['document', docId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/documents/${docId}`)
      return res.data.data
    },
    enabled: !!workspace && !!docId,
  })

  const saveDoc = useMutation({
    mutationFn: (content: unknown) =>
      api.patch(`/workspaces/${workspace!.id}/documents/${docId}`, { content }),
  })

  // Y.js socket collaboration
  useEffect(() => {
    const socket = getSocket()
    socket.emit('doc:subscribe', { docId })

    socket.on('doc:sync', ({ docId: id, message }: { docId: string; message: ArrayBuffer }) => {
      if (id !== docId) return
      Y.applyUpdate(ydoc, new Uint8Array(message))
      synced.current = true
    })

    socket.on('doc:update', ({ docId: id, update }: { docId: string; update: ArrayBuffer }) => {
      if (id !== docId) return
      Y.applyUpdate(ydoc, new Uint8Array(update))
    })

    ydoc.on('update', (update: Uint8Array) => {
      if (synced.current) {
        socket.emit('doc:update', { docId, update: update.buffer })
      }
    })

    return () => {
      socket.emit('doc:unsubscribe', { docId })
      socket.off('doc:sync')
      socket.off('doc:update')
    }
  }, [docId, ydoc])

  const editor = useCreateBlockNote({
    collaboration: {
      provider: null as any, // Y.js doc is managed manually via socket
      fragment: ydoc.getXmlFragment('content'),
      user: {
        name: workspace?.name ?? 'User',
        color: '#6366f1',
      },
    },
  })

  // Auto-save every 10s
  useEffect(() => {
    const timer = setInterval(() => {
      if (editor) {
        const content = editor.document
        saveDoc.mutate(content)
      }
    }, 10_000)
    return () => clearInterval(timer)
  }, [editor])

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Doc header */}
      <div className="px-8 py-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold text-white">{doc.title}</h1>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto px-8 py-6 max-w-4xl mx-auto w-full">
        <BlockNoteView
          editor={editor}
          theme="dark"
        />
      </div>
    </div>
  )
}

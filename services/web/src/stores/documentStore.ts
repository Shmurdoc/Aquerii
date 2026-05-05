import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Document {
  id: string
  workspace_id: string
  folder_id?: string
  title: string
  created_by: string
  last_edited_by?: string
  last_edited_at?: string
  created_at: string
}

interface DocumentState {
  documents: Record<string, Document>
  setDocuments: (docs: Document[]) => void
  setDocument: (doc: Document) => void
  removeDocument: (id: string) => void
}

export const useDocumentStore = create<DocumentState>()(
  immer((set) => ({
    documents: {},

    setDocuments: (docs) => set((s) => {
      s.documents = {}
      docs.forEach((d) => { s.documents[d.id] = d })
    }),

    setDocument: (doc) => set((s) => { s.documents[doc.id] = doc }),

    removeDocument: (id) => set((s) => { delete s.documents[id] }),
  }))
)

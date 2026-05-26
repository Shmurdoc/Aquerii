import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useEmailTemplates, useCreateEmailTemplate, useDeleteEmailTemplate, EmailTemplate } from '@/lib/marketing'
import { Plus, Loader2, Trash2, FileText, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EmailTemplatesPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const [category, setCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', content_html: '', content_text: '', category: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const params: Record<string, string> = {}
  if (category) params.category = category

  const { data, isLoading } = useEmailTemplates(wid, Object.keys(params).length ? params : undefined)
  const templates = data?.data ?? []
  const createTemplate = useCreateEmailTemplate(wid)
  const deleteTemplate = useDeleteEmailTemplate(wid)

  if (!workspace) return null

  const handleCreate = () => {
    if (!form.name.trim() || !form.subject.trim()) return
    createTemplate.mutate(form as any, {
      onSuccess: () => { setShowForm(false); setForm({ name: '', subject: '', content_html: '', content_text: '', category: '' }) },
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white flex-1">Email Templates</h1>
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Filter category" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36" />
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={12} /> New template
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <input placeholder="Template name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <input placeholder="Subject line" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <textarea placeholder="HTML content" value={form.content_html} onChange={e => setForm(f => ({ ...f, content_html: e.target.value }))} rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600 resize-none font-mono" />
          <input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button onClick={handleCreate} disabled={!form.name.trim() || !form.subject.trim()} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">Save</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-600">
          <FileText size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No templates yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <FileText size={16} className="text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{t.name}</p>
                    {t.category && <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{t.category}</span>}
                    {t.is_shared && <span className="text-[10px] text-green-500 bg-green-900/30 px-1.5 py-0.5 rounded">Shared</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{t.subject}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteTemplate.mutate(t.id) }} className="p-1 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
              </div>
              {expandedId === t.id && (
                <div className="border-t border-gray-800 px-4 py-3">
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap max-h-60 overflow-y-auto bg-gray-800/50 rounded-lg p-3">{t.content_html || t.content_text || 'No content'}</pre>
                  {t.createdBy && <p className="text-[10px] text-gray-600 mt-2">Created by {t.createdBy.name}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
